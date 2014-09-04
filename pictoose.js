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
var imagemagick 	= require('imagemagick-native');

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
var mimeTypes = {
	"image/png"				: "png",
	"image/jpg"				: "jpg",
	"image/jpeg"			: "jpeg",
	"image/gif"				: "gif",
	"image/x-windows-bmp"	: "bmp",
	"image/bmp"				: "bmp",
	"image/webp"			: "webp"
}

/**
 * Checks if a given mimetype is valid.
 * Returns the extension or false if it's not valid 
 */
var CheckMimeType = function(mime){
	// If the mimetype exists in the object...
	if ( mimeTypes.hasOwnProperty(mime) ){
		return mimeTypes[mime];
	}else{
		return false;
	}
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
		if (filename && filename != ""){
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
			var extension = CheckMimeType(mimetype);
			if(extension){
				fs.unlink(Settings.RESOURCE_STORAGE_ROOT+anchor.get("_"+field+"_resid"), function(err){
					if(err){ console.error(err); }
				});
				filename = randomString(32,'abcdef1234567890')+"."+extension;
				fs.writeFile(Settings.RESOURCE_STORAGE_ROOT+filename, value.split(',')[1], 'base64', function(err){
					if(err){ console.error(err); return; }
					anchor.set("_"+field+"_resid", filename);
					anchor.save();
				});
			}else{
				console.log('mimetype inválido: '+mimetype);
			}
		}else if(fs.existsSync(value) && !fs.existsSync(Settings.RESOURCE_STORAGE_ROOT+filename)){
			// It's a path, move it!
			fs.rename(value, Settings.RESOURCE_STORAGE_ROOT+filename, function(err){
				if(err){ console.error(err); return; }
				anchor.set("_"+field+"_resid", filename);
				anchor.save();
			});
		}else if(value == '' || value == null || value == undefined){
			fs.unlink(Settings.RESOURCE_STORAGE_ROOT+anchor.get("_"+field+"_resid"), function(err){
				if(err){ console.error(err); }
			});
			anchor.set("_"+field+"_resid", '');
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
			fs.unlink(Settings.RESOURCE_STORAGE_ROOT+ this["_"+fields[x]+"_resid"], function(err){
				console.log('Error borrando');
				console.error(err);
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
		}else if(parsedOptions && fs.existsSync(Settings.RESOURCE_STORAGE_ROOT+req.params.resid)){
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