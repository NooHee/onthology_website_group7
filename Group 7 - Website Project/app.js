//---------- handlebars ----------//
const express = require('express')
const expressHandlebars = require('express-handlebars')

//---------- .ttl read ----------//
const fs = require('fs')
const $rdf = require('rdflib')

const store = $rdf.graph()

//---------- userString ----------//

const turtleString = fs.readFileSync('resources.ttl').toString()
$rdf.parse(
	turtleString,
	store,
	"http://schema.org/Person",
	"text/turtle"
)

const stringQuery = `
	SELECT
		?identifier
		?name
		?image
		?seeks
		?artistName
		?artistID
		?artistGenre
	WHERE {
		?user a <http://schema.org/Person> .
		?user <http://schema.org/identifier> ?identifier .
		?user <http://schema.org/name> ?name .
		?user <http://schema.org/image> ?image .
		?user <http://schema.org/seeks> ?seeks .
		?seeks <http://schema.org/name> ?artistName .
		?seeks <http://schema.org/identifier> ?artistID .
		?seeks <http://schema.org/image> ?artistImg .
		?seeks <http://schema.org/description> ?artistDesc .
		?seeks <http://schema.org/genre> ?artistGenre .
	}
`
const queryUser = $rdf.SPARQLToQuery(stringQuery, false, store)

const users = store.querySync(queryUser).map(
	userResult => {
		return {
			id: userResult['?identifier'].value,
			name: userResult['?name'].value,
			image: userResult['?image'].value,
			artistName: userResult['?artistName'].value,
			artistID: userResult['?artistID'].value,
			artistImg: userResult['?artistImg'].value,
			artistDesc: userResult['?artistDesc'].value,
			artistGenre: userResult['?artistGenre'].value,
			//artistTitle: userResult['?artistTitle'].value
		}
	}
)

console.log(users)

//---------- WikiData ----------//

	for(const music of users) {

		const ParsingClient = require('sparql-http-client/ParsingClient')

		const wikidquery = `
		SELECT DISTINCT ?q ?artistname ?genre WHERE {
			?q wdt:P106 wd:Q177220.
			?q rdfs:label ?artistname filter (lang(?artistname) = "en").
			?q wdt:P136 ?genretype.
			?genretype rdfs:label ?genre filter (lang(?genre) = "en").
			FILTER CONTAINS (?artistname, "${music.artistName}").
		} 
		LIMIT 1
		`
		const client = new ParsingClient({ 
			endpointUrl: "http://query.wikidata.org/sparql", 
			headers: {"Accept": "application/sparql-results+json", 
			"User-Agent": "Next-Generation-Web-Group7/1.0 (seno22fe@student.ju.se) NGW-Project/1.0"

		}
		})
		console.log()
		client.query.select(wikidquery).then(rows => {
			rows.forEach(row => {
					music.artistGenre = row.genre.value

					const client = new ParsingClient({ 
						endpointUrl: "http://dbpedia.org/sparql", 
						headers: {"Accept": "application/json"}
					})

					// const trackquery = `
					// SELECT DISTINCT ?comment WHERE {
					// 	?name foaf:name "${music.artistTitle}" @en .
					// 	?name rdfs:comment ?comment .
					// 	FILTER(lang(?comment) = "en") .
					// }
					// `
					// client.query.select(trackquery).then(rows => {
					// 	rows.forEach(row => {
					// 		music.artistTitle = row.comment.value
					// 	})
					// })

					const dbquery = `
					SELECT DISTINCT ?name ?thumbnail ?abstract WHERE {
						?name foaf:name "${music.artistName}" @en .
						?name rdf:type ?person .
						?person rdfs:label "person" @en .
						?name dbo:thumbnail ?thumbnail .
						?name dbo:abstract ?abstract .
						FILTER(lang(?abstract) = "en") .
					} 
					`	
					client.query.select(dbquery).then(rows => {
						rows.forEach(row => {
							music.artistImg = row.thumbnail.value
							music.artistDesc = row.abstract.value
						})
					})
					//console.log(music)
				})
		})
	}

//---------- Websites ----------//
const app = express()

app.engine('hbs', expressHandlebars.engine({
	defaultLayout: 'main.hbs'
}))

app.use(express.static('public'))

app.get('/', function(request, response){
	response.render('start.hbs')
})

app.get('/about', function(request, response){
	response.render('about.hbs')
})

app.get('/contact', function(request, response){
	response.render('contact.hbs')
})

app.get('/users', function(request, response){
	const model = {
		users
	}
	response.render('users.hbs', model)
})

app.get('/users/:id', function(request, response){
	const id = request.params.id // 123
	const model = {
		user: users.find(g => g.id == id)
	}
	response.render('user.hbs', model)
})

app.get('/users/:id/music', function(request, response){
	const id = request.params.id // 123
	const model = {
		user: users.find(g => g.id == id),
		users
	}
	response.render('music.hbs', model)
})

app.get('*', function(request, response){
	response.render('not-found.hbs')
})

app.listen(8080)

console.log("http://localhost:8080/users/")