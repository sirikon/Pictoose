'use strict';

var express 	= require('express');
var bodyparser 	= require('body-parser')
var multer 		= require('multer');
var mongoose 	= require('mongoose');
var Pictoose	= require('../pictoose.js');
var Schema 		= mongoose.Schema;
mongoose.connect('mongodb://localhost/testpictoose');

var CarSchema = new Schema({
	model: String,
})
CarSchema.plugin(Pictoose.Plugin, ['thumbnail','brand']);

Pictoose.Config('RESOURCE_STORAGE_ROOT', './public/');
Pictoose.Config('RESOURCE_STORAGE_URL', 'http://127.0.0.1:3000/public/');
Pictoose.Config('RESOURCE_MAIN_URL', 'http://127.0.0.1:3000/resources/');

var Car = mongoose.model('Car', CarSchema);

var app = express();

app.use(multer({dest: './uploads/'}));
app.use(bodyparser.urlencoded({limit: '500mb'}));
app.use(bodyparser.json({limit: '500mb'}));

app.use('/public',express.static('./public'));
app.use('/test',express.static('./test/html'));

app.get('/resources/:resid', Pictoose.RouteController);

app.get('/', function(req,res){
	Car.find().exec(function(err,docs){
		res.send(docs);
	});
});

app.get('/cars', function(req,res){
	Car.find().exec(function(err,docs){
		res.send(docs);
	});
});

app.post('/', function(req,res){
	var myCar = new Car(req.body);
	myCar.thumbnail = req.files.thumbnail.path;
	myCar.brand = req.files.brand.path;
	myCar.save();
	res.send(myCar.thumbnail + ", " + myCar.brand);
});

app.post('/base64', function(req,res){
	var myCar = new Car(req.body);
	myCar.save();
	res.send(myCar.thumbnail + ", " + myCar.brand);
});

app.get('/:carid/update', function(req,res){
	Car.findById(req.params.carid, function(err,doc){
		for(var key in req.query){
			doc[key] = req.query[key];
		}
		doc.save();
		res.send('ok');
	});
});

app.delete('/:carid', function(req,res){
	Car.findById(req.params.carid).exec(function(err,doc){
		doc.remove();
		res.send('ok');
	})
});

app.delete('/', function(req,res){
	Car.find().exec(function(err,docs){
		for(var x in docs){
			docs[x].remove();
		}
		res.send('ok');
	});
});

app.listen(3000);
console.log('Listening on port 3000');