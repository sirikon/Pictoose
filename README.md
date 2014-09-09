Pictoose
========
[![Pictoose on NPM](http://img.shields.io/npm/v/pictoose.svg)](https://www.npmjs.org/package/pictoose)
[![Pictoose downloads](http://img.shields.io/npm/dm/pictoose.svg)](https://www.npmjs.org/package/pictoose)

Pictoose is a Mongoose plugin made for make image storage (and video!) easiest possible

Now with image resizing

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
var Pictoose	= require('pictoose');

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

You can also use a base64 string or a public URL to store images

```javascript
app.post('/', function(req,res){
	var muCar = new Car(req.body);
	myCar.thumbnail = req.body.thumbnail; // (data:image/png;base64,...)
	myCar.brand = 'http://anotherserver.com/image.png';
	myCar.save();
	res.send('ok');
});
```

When Pictoose receives a new image/video in base64/filepath, it will validate the file.

Supported file formats:

 * png
 * jpg
 * jpeg
 * gif
 * png
 * bmp
 * webp
 * mp4
 * avi
 * mov
 * mpeg

If Pictoose receives a public URL will not validate anything and will directly store the URL

That's all!

## Image Resizing ##

Image resizing is simple, if we have the following URL generated and stored by Pictoose:
```
http://127.0.0.1:3000/resources/d8fbd233ac9deee7046841f02fb313ed.jpg
```
And we add this query:
```
http://127.0.0.1:3000/resources/d8fbd233ac9deee7046841f02fb313ed.jpg?resize=200x300afit
```
Will resize the image, store it in his new size, and return the public URL of the new image, the next time we query the same resize options, the image will be already resized and stored.

Resize options are: widthxheight(fill|afit|afil)

## License ##
MIT
