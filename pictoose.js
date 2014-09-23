//     ______ _      _                       
//     | ___ (_)    | |                      
//     | |_/ /_  ___| |_ ___   ___  ___  ___ 
//     |  __/| |/ __| __/ _ \ / _ \/ __|/ _ \
//     | |   | | (__| || (_) | (_) \__ \  __/
//     \_|   |_|\___|\__\___/ \___/|___/\___|
//
//  Carlos Fernández (@sirikon) - Seis Cocos S.L.

/* use strict & requirements */
'use strict';
var fs 				= require('fs');
var path 			= require('path');
var url 			= require('url');
try {
	var imagemagick = require('imagemagick-native');
}catch(err){
	var imagemagick = null;
}


/* Settings */
var Settings = {
	RESOURCE_STORAGE_ROOT: 	"./resources/",
	RESOURCE_STORAGE_URL: 	"/public/",
	RESOURCE_MAIN_URL: 		"/resources/"
}

/* Regular expression to check if a string is base64 */
var base64RegExp 			= new RegExp("^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$");
var resizeOptionsRegExp 	= new RegExp("^[0-9]{1,4}x[0-9]{1,4}(afit|afil|fill)*$");

/* Allowed MimeTypes list */
var mimes = {
	"image/png"				: {extension: "png", 	type: "image"},
	"image/jpg"				: {extension: "jpg", 	type: "image"},
	"image/jpeg"			: {extension: "jpeg", 	type: "image"},
	"image/gif"				: {extension: "gif", 	type: "image"},
	"image/x-windows-bmp"	: {extension: "bmp", 	type: "image"},
	"image/bmp"				: {extension: "bmp", 	type: "image"},
	"image/webp"			: {extension: "webp", 	type: "image"},
	"video/mp4"				: {extension: "mp4", 	type: "video"},
	"video/avi"				: {extension: "avi", 	type: "video"},
	"video/msvideo"			: {extension: "avi", 	type: "video"},
	"video/x-msvideo"		: {extension: "avi", 	type: "video"},
	"video/quicktime"		: {extension: "mov", 	type: "video"},
	"video/mpeg"			: {extension: "mpeg", 	type: "video"},
}

/**
 * Checks if a given mimetype is valid
 * Returns the extension or false if it's not valid 
 */
var GetMimeExtension = function(mime){
	// If the mimetype exists in the object...
	if ( mimes.hasOwnProperty(mime) ){
		return mimes[mime].extension;
	}else{
		return false;
	}
}

/**
 * Checks if a given mimetype is valid.
 * Returns the type or false if it's not valid 
 */
var GetMimeType = function(mime){
	// If the mimetype exists in the object...
	if ( mimes.hasOwnProperty(mime) ){
		return mimes[mime].type;
	}else{
		return false;
	}
}

/**
 * Checks if a given mimetype is valid.
 * Returns the type or false if it's not valid 
 */
var GetMimeTypeByExtension = function(ext){
	var extension = ext;
	if(extension.indexOf('.') >= 0){
		extension = extension.substr( extension.indexOf('.')+1 );
	}
	for (var x in mimes){
		if( mimes[x].extension == extension ){
			return mimes[x].type;
		}
	}
	return false;
}

/**
 * Checks if a given base64 string is valid.
 * Returns true/false
 */
var CheckBase64 = function(data){

	/*
	 * A string is base64 when:
	 * 1.- is not undefined/false
	 * 2.- have a single comma
	 * 3.- matches the regular expression
	 */
	if ( !data ){
		return false;
	}

	if( data.indexOf(",") == -1 ){
		return false;
	}

	if(  data.indexOf(",") != data.lastIndexOf(",") ){
		return false;
	}

	var d = data.split(',')[1];

	return base64RegExp.test(d);
}

/**
 * Returns a random string with the given lenght and allowed chars
 */
var randomString = function(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
    return result;
}

var ParseResizeOptions = function(options){
	if( !resizeOptionsRegExp.test(options) ){
		return false;
	}

	var mode;
	switch(options.substr(-4)) {
		case 'afil':
			mode = 'aspectfill';
			break;
		case 'afit':
			mode = 'aspectfit';
			break;
		case 'fill':
			mode = 'fill';
			break;
	}

	var rest = options.substr(0, options.length-4);
	var rest = rest.split('x');

	return {
		width: parseInt(rest[0]),
		height: parseInt(rest[1]),
		mode: mode
	}
}

var ParseFormatFromExtension = function(extension){
	var ext = extension.toLowerCase();
	var result;
	switch(ext){
		case 'png':
			result = 'PNG';
			break;
		case 'gif':
			result = 'GIF';
			break;
		case 'bmp':
			result = 'BMP';
			break;
		default:
			result = 'JPEG';
	}
	return result;
}

/**
 * Mongoose Getter
 */
var PictureGetter = function(field){
	return function(){
		var filename = this.get("_"+field+"_resid");
		if ( url.parse(filename).host ){
			return filename;
		}else if( filename && filename != "" ){
			return Settings.RESOURCE_MAIN_URL+this.get("_"+field+"_resid");
		}else{
			return "";
		}
	}
}

/**
 * Mongoose Setter
 */
var PictureSetter = function(field){
	return function(value){
		var anchor = this;
		var filename = path.basename(value)

		if(CheckBase64(value)){
			// It's base64, save it!
			var mimetype = value.substr(5).split(";")[0];
			var extension = GetMimeExtension(mimetype);
			if(extension){
				filename = randomString(32,'abcdef1234567890')+"."+extension;
				anchor.set("_"+field+"_resid", filename);

				fs.exists(Settings.RESOURCE_STORAGE_ROOT+anchor.get("_"+field+"_resid"), function(existsit){
					if(existsit && fs.lstatSync(Settings.RESOURCE_STORAGE_ROOT+anchor.get("_"+field+"_resid")).isFile()){
						fs.unlink(Settings.RESOURCE_STORAGE_ROOT+anchor.get("_"+field+"_resid"), function(err){
							if(err){
								console.log('Error removing previous image: '+Settings.RESOURCE_STORAGE_ROOT+anchor.get("_"+field+"_resid"));
								console.error(err);
								return;
							}
						});
					}
				});
				
				fs.writeFile(Settings.RESOURCE_STORAGE_ROOT+filename, value.split(',')[1], 'base64', function(err){
					if(err){
						console.log('Error writing on disk the new file: '+Settings.RESOURCE_STORAGE_ROOT+filename);
						console.error(err);
						anchor.set("_"+field+"_resid", '');
						return;
					}
					anchor.save();
				});
			}else{
				console.log('invalid mimetype: '+mimetype);
			}
		}else if(fs.existsSync(value) && !fs.existsSync(Settings.RESOURCE_STORAGE_ROOT+filename)){
			// It's a path, move it!
			anchor.set("_"+field+"_resid", filename);
			fs.rename(value, Settings.RESOURCE_STORAGE_ROOT+filename, function(err){
				if(err){
					console.log('Error moving the new file: '+Settings.RESOURCE_STORAGE_ROOT+filename);
					console.error(err);
					anchor.set("_"+field+"_resid", '');
					return;
				}
				anchor.save();
			});
		}else if(value == '' || value == null || value == undefined){
			fs.unlink(Settings.RESOURCE_STORAGE_ROOT+anchor.get("_"+field+"_resid"), function(err){
				if(err){
					console.log('Error removing the actual file: '+Settings.RESOURCE_STORAGE_ROOT+anchor.get("_"+field+"_resid"))
					console.error(err);
					return;
				}
			});
			anchor.set("_"+field+"_resid", '');
		}else if( url.parse(value).host ){
			anchor.set("_"+field+"_resid", value);
		}else{
			// Unknown
			console.error('Could not save: ' + value);
		}		
	}
}

/**
 * Fields creator of the given field names
 */
var PictureFieldCreator = function(fields){
	var newFields = {};
	for (var i in fields){
		newFields["_"+fields[i]+"_resid"] = {type: String, default: "", select: true};
	}
	return newFields;
}

/**
 * Mongoose Post Remove
 */
var PictureRemover = function(fields){
	return function(doc){
		for(var x in fields){
			if( !fs.existsSync( Settings.RESOURCE_STORAGE_ROOT+doc["_"+fields[x]+"_resid"] ) ){ return; }
			if( !fs.lstatSync(Settings.RESOURCE_STORAGE_ROOT+doc["_"+fields[x]+"_resid"]).isFile() ){ return; }
			fs.unlink(Settings.RESOURCE_STORAGE_ROOT+doc["_"+fields[x]+"_resid"], function(err){
				if(err){
					console.log('Error removing: ' + Settings.RESOURCE_STORAGE_ROOT+doc["_"+fields[x]+"_resid"]);
					console.error(err);
				}
			});
		}
	}
}

/**
 * Mongoose Plugin
 */
var Plugin = function(schema,fields){
	for(var i in fields){
		schema.virtual(fields[i]).get(PictureGetter(fields[i]));
		schema.virtual(fields[i]).set(PictureSetter(fields[i]));
	}
	schema.set('toJSON', {virtuals: true});
	schema.set('toObject', {virtuals: true});
	schema.add(PictureFieldCreator(fields));
	schema.post('remove', PictureRemover(fields));
}

/**
 * Given a key/value, stores it in Settings
 */
var Config = function(key,value){
	Settings[key] = value;
}

/**
 * Express Route Controller
 * Will return an image or redirect to a image
 */
var RouteController = function(req,res){
	var filename = req.params.resid;
	var parsedOptions = ParseResizeOptions(req.query.resize);
	var filenameExtension;
	var filenameName;
	if(req.query.resize && parsedOptions){
		filenameExtension = filename.substr(filename.lastIndexOf('.'));
		filenameName = filename.substr(0,filename.lastIndexOf('.'));
		filename = filenameName+"_"+req.query.resize+filenameExtension;
	}
	fs.exists(Settings.RESOURCE_STORAGE_ROOT+filename, function(exists){
		if(exists){
			res.redirect(Settings.RESOURCE_STORAGE_URL+filename);
		}else if(parsedOptions && GetMimeTypeByExtension(filenameExtension) == 'image' && fs.existsSync(Settings.RESOURCE_STORAGE_ROOT+req.params.resid) && imagemagick){
			var format = ParseFormatFromExtension(filenameExtension);
			var resizedBuffer = imagemagick.convert({
				srcData: fs.readFileSync(Settings.RESOURCE_STORAGE_ROOT+req.params.resid),
				width: parsedOptions.width,
				height: parsedOptions.height,
				resizeStyle: parsedOptions.mode,
				quality: 75,
				format: format
			});
			fs.writeFileSync(Settings.RESOURCE_STORAGE_ROOT+filename,resizedBuffer);
			res.redirect(Settings.RESOURCE_STORAGE_URL+filename);
		}else{
			res.redirect(Settings.RESOURCE_STORAGE_URL+req.params.resid);
		}
	})
}

/**
 * Module exports
 */
module.exports = {
	Plugin: Plugin,
	Config: Config,
	RouteController: RouteController
}