Pictoose
========
Pictoose is a Mongoose plugin made for make image storage easiest possible

## How to use it ##
Lets supose that you actually have this code:

```javascript
// Requirements
var express 	= require('express');
var multer 		= require('multer');
var mongoose 	= require('mongoose');
var Schema 		= mongoose.Schema;
// Create Express Server
var app = express();
app.use(multer({dest: './uploads/'}));
// Connect to database
mongoose.connect('mongodb://localhost/testpictoose');

// Car Schema & Model
var CarSchema = new Schema({
	model: String,
})
var Car = mongoose.model('Car', CarSchema);

...

app.listen(3000);
console.log('Listening on port 3000');
```

To use Pictoose all you need to do is require de module, configure it and include the plugin to a Schema by this way:

```javascript
var Pictoose	= require('../pictoose.js');

Pictoose.Config('RESOURCE_STORAGE_ROOT', './public/');
Pictoose.Config('RESOURCE_STORAGE_URL', 'http://127.0.0.1:3000/public/');
Pictoose.Config('RESOURCE_MAIN_URL', 'http://127.0.0.1:3000/resources/');

CarSchema.plugin(Pictoose.Plugin, ['thumbnail','brand']);

app.use('/public',express.static('./public'));
app.get('/resources/:resid', Pictoose.RouteController);
```

Now every image will be stored in the 'public' folder (RESOURCE\_STORAGE\_ROOT), Pictoose will construct the URLs using the RESOURCE\_STORAGE\_URL to return de images.

Also you need to specify a RESOURCE\_MAIN\_URL used to handle broken links, resizing, etc. and add it to your Express routing.

And finally, will create the fields 'thumbnail' and 'brand', so to save an image with Pictoose al you need to do is this:

```javascript
app.post('/', function(req,res){
	var myCar = new Car(req.body);
	// Just save the image's local URI after it was uploaded and saved by, in this case, Multer
	myCar.thumbnail = req.files.thumbnail.path;
	myCar.brand = req.files.brand.path;
	myCar.save();
	res.send('ok');
});
```

That's all!

## License ##
MIT
