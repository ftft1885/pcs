/**
 * Copyright (c) 2013 TongFeng
 * Nodejs SDK for baidu pcs
 * Released under the MIT, BSD, and GPL Licenses
 * Email: 527653908@qq.com
 */

var https = require('https');
var querystring = require('querystring');
var path = require('path');
var fs = require('fs');
var util = require('util');
var events = require('events');
var crypto = require('crypto');

var pcs = function(access_token,apppath){	
/**
 * Constructor.
 *
 * @param string	baidu pcs access_token
 * @param string	app path authorized such as myapp not /apps/myapp
 */
	
	this.at = access_token;
	this.apppath = '/apps/'+apppath+'/';
}
module.exports = pcs;

function Listener(){	
	events.EventEmitter.call(this);	
	var self = this;	
	self.count = 0;
	self.files = [];
	self.on('file',function(file,type){			
		self.files.push(file);		
	});
	self.on('dir',function(dir,type){
		switch(type){
			case 'walkpcs':self.walkpcs(dir);break;
			case 'walk':self.walk(dir);break;
		}		
	});	
	self.on('sync',function(files){
		self.count++;
	
		self.testMD5(files);
		
	});
	return self;
}
util.inherits(Listener, events.EventEmitter);

pcs.prototype.getQuota = function(callback){
/**
 * Api getQuato
 *
 * @callback quota used
*/
	var query = {
		method	:	'info',
		access_token : this.at
	}
	var p = {
		query : query,
		type : 'quota'
	}
	var opts = this.getOpts(p);
	this.request(opts,function(text){
		callback(text)
	});
}

pcs.prototype.getMeta = function(dirname,callback){
/**
 * Api getMeta
 *
 * @callback meta info
*/
	if(dirname[0] === '/'){
		dirname = dirname.substring(1,dirname.length);		
	}
	if(!(dirname.indexOf(this.apppath) === 0)){
		dirname = this.apppath + dirname;
	}
	if(dirname[dirname.length-1] === '/'){
		dirname = dirname.substring(0,dirname.length-1);
	}
	var query = {
		method : 'meta',
		access_token : this.at,
		path : dirname
	}
	var p = {
		query : query,
		type : 'file'
	}
	var opts = this.getOpts(p);
	this.request(opts,function(text){
		callback(text);
	});
	//console.log(dirname);
}

pcs.prototype.getList = function(_dirpath,callback){
/**
 * Api getList
 *
 * @callback Array : file list just below
*/	
	var query = {
		method : 'list',
		access_token : this.at,
		path : _dirpath
	}
	var p = {
		query : query,
		type : 'file'
	}
	var opts = this.getOpts(p);
	this.request(opts,function(text){		
		var result = JSON.parse(text).list;
		callback(result);
	});	
}



pcs.prototype.getFile = function(arg,callback){	
/**
 * Api getFile
 *
 * @callback Message : success to write pointed path
*/	
	var self = this;	
	var newpath = "";
	var remote = arg;
	if(typeof remote === 'object'){
		remote = arg.remote;
		newpath = arg.newpath;
	}
	var local = path.resolve(newpath,self.toNativePath(remote));
	checkdirSync(local);//mkdir first
	var localfile = fs.createWriteStream(local);
	var query = {
		method : 'download',
		access_token : self.at,
		path : remote
	}	
	var p = {
		method : 'GET',
		query : query,
		type:'file'
	}
	var opts = self.getOpts(p);	
	var req = https.request(opts,function(res){		
		var text = "";
		res.on('data',function(data){		
			localfile.write(data);
		});
		res.on('end',function(){
			localfile.end();
			if(typeof callback === 'function'){				
				callback("download "+path.basename(remote)+" success in "+local);
			}
			
		})
	});	
	req.end();	
}

pcs.prototype.postFile = function(filepath,webpath,mycallback){	
/**
 * Api postFile
 *
 * @callback filename uploaded
*/	
	filepath = filepath.replace(/\\/g,'/');
	var filename = path.basename(filepath);
	if(typeof webpath === 'string'){
		filename = [webpath,filepath].join('/');
	}
	var callback = mycallback || webpath;
	var query = {
		method : 'upload',		
		path :  filename,
		access_token : this.at,	
		ondup : 'overwrite'
	}
	var p = {
		method : 'POST',
		query : query,
		type : 'file'	
	}
	if(filepath.indexOf('Thumbs.db') > -1){
		callback('ignore Thumbs.db');
		return;
	}
	var filedata = fs.readFileSync(filepath);
	var _url = 'https://pcs.baidu.com/rest/2.0/pcs/file'+'?'+querystring.stringify(query);
	var opts = this.getOpts(p);
	var boundaryKey = Math.random().toString(16);
	
	var payload = '--' + boundaryKey + '\r\n'    
    + 'Content-Type: text/plain\r\n'   
    + 'Content-Disposition: form-data; name="file"; filename="'+filename+'"\r\n\r\n';
	
	var enddata  = '\r\n--' + boundaryKey + '--';	
	
	var req = https.request(opts,function(res){
		res.on('data',function(data){
			//console.log(data+"");
		});
		res.on('end',function(){
			if(typeof callback === 'function')
			callback(filename);
		})
	});	
	
	req.setHeader('Content-Type','multipart/form-data; boundary='+boundaryKey+'');
	req.setHeader('Content-Length',Buffer.byteLength(payload)+Buffer.byteLength(enddata)+filedata.length);
	req.write(payload);
	
	var fileStream = fs.createReadStream(filepath, { bufferSize: 4 * 1024 });
	fileStream.pipe(req, {end: false});
	fileStream.on('end', function() {			
		req.end(enddata); 
	});	
}

pcs.prototype.deleteFile = function(filepath,callback){
/**
 * Api deleteFile
 *
 * @callback required id
*/	
	var self = this;	
	var query = {
		method : 'delete',		
		path : filepath,		
		access_token : this.at,			
	}	
	var p = {
		query : query,
		type : 'file'
	}
	var opts = self.getOpts(p);
	this.request(opts,function(text){
		callback(text);
	})
}

pcs.prototype.downloadAll = function(arg,callback){
/**
 * Advance Api downloadAll
 * using api getTrueList()
 * using api getFile()
 * 
 * @callback Message download all
*/	
	var self = this;
	var mypath = arg;
	if(typeof mypath === 'object'){
		mypath = arg.remote;
	}
	self.getTrueList(mypath,function(files){		
		var count = files.length;
		files.forEach(function(file){
			self.getFile({remote:file,newpath:arg.newpath||""},function(text){			
				count --;
				//console.log(text);
				console.log('last file: '+count);
				if(count <= 0){
					callback("download all");
				}
			});
		});
	});
}

pcs.prototype.getTrueList = function(dirname,callback){
/**
 * Advance Api getTrueList using getList
 *
 * @callback Array : filepath all below
*/	
	var _this = this;		
	Listener.prototype.walkpcs = function(mypath){
		var self = this;			
		_this.getList(mypath,function(result){						
			self.count += result.length - 1;
			result.forEach(function(file){
				if(file.size == 0){
					self.emit('dir',file.path,'walkpcs');
				}
				else{
					self.emit('file',file.path,'walkpcs');
					self.count --;
				}
				if(self.count < 0){
					self.emit('end');
				}
			})
		})
	}	
	var listener = new Listener();
	listener.on('end',function(){
		callback(this.files)
	});
	listener.walkpcs(dirname);
}

pcs.prototype.postFileArr = function(files,newpath,mycallback){
/**
 * Advance Api postFileArr using postFile
 *
 * @callback Message : upload success
*/	
	var callback = mycallback || newpath;
	var newpathname = '';
	if(typeof newpath === 'string'){
		newpathname = newpath;
	}
	var self = this;		
	var count = files.length;
	if(files.length === 0){
		callback('no file');
	}
	files.forEach(function(file){
		self.postFile(file,newpathname,function(){
			count -- ;
			console.log('last file: '+count);
			if(count <= 0){				
				if(typeof callback === 'function')
					callback("upload success");
			}
		});
	})	
}


pcs.prototype.uploadAll = function(mypath,newpath,mycallback){
/**
 * Advance Api uploadAll
 * using api postFileArr
 * 
 * @callback Message upload all
*/	
	var callback = mycallback || newpath;
	var newpathname = '';
	if(typeof newpath === 'string'){
		newpathname = newpath;
	}
	var self = this;
	self.listNativeFile(mypath,function(files){		
		self.postFileArr(files,newpathname,function(text){
			callback(text);
		})
	})
}

pcs.prototype.deleteFileArr = function(fileArr,callback){
/**
 * Advance Api deleteFileArr using deleteFile
 *
 * @callback Message : delete all
*/	
	var self = this;
	var count = 1;
	if(fileArr.length === 0){
		callback("no file");
	}
	fileArr.forEach(function(file){
		self.deleteFile(file,function(text){
			console.log(text);
			if(count >= fileArr.length){
				callback("delete all");
			}
			count++;
		})
	});
}

pcs.prototype.syncFolder = function(folder,callback){
/**
 * Super Advanced Api syncFolder to sync a folder
 *
 * @callback Message : sync finish
*/	
	var self = this;
	var files = listFileByTimeSync(folder);
	var deletefiles = [];
	var uploadfiles = [];
	var optCount = 0;	
	Listener.prototype.testMD5 = function(files){
		var ll = this;		
		if(ll.count >= files.length){
			ll.emit('end',ll.count);
			return;
		}
		var name = files[ll.count].split(path.sep).join('/');
		self.getMeta(name,function(text){
			//console.log(text);
			getMD5(name,function(d){				
				var index = text.indexOf(d);
				if(index === -1){
					//console.log("need sync");
					ll.emit('sync',files);
				}
				else{
					ll.emit('end',ll.count);
				}
			})
		});
	}
	var listener = new Listener();
	listener.testMD5(files);
	listener.on('end',function(){
		for(var i = 0; i < this.count; i++){
			uploadfiles.push(files[i]);
		}
		
		self.postFileArr(uploadfiles,function(text){
			console.log(text);
			optCount++;
			if(optCount >= 2){
				callback("sync finish");
			}
		})	
	})
	
	self.getTrueList(folder,function(webfiles){
		var result = [];
		webfiles.forEach(function(file){
			result.push(self.toNativePath(file));
		});
		result.forEach(function(file){
			if(files.indexOf(file) === -1){
				deletefiles.push(file);
			}
		})
		//console.log(deletefiles);
		self.deleteFileArr(deletefiles,function(text){
			console.log(text);
			optCount++;
			if(optCount >= 2){
				callback("sync finish");
			}			
		})
		
	})
	
	callback(files);
}

function listFileByTimeSync(folder){
	var files = listFileSync('./'+folder);
	var mtime = getStatSync(files);
	files.sort(function(a,b){return mtime[b] - mtime[a]});
	return files;
}

pcs.prototype.listNativeFile = function(mypath,callback){
/**
 * Tool function 
 *
 * @callback all files below
*/	
	Listener.prototype.walk = function(mypath){
		var self = this;	
		fs.readdir(mypath,function(err,result){	
			self.count += result.length - 1;
			result.forEach(function(file){
				var _path = path.join(mypath,file);
				fs.lstat(_path,function(err,stat){
					if(err){
						console.log(err);
					}
					if(stat.isFile()){
						self.count --;
						self.emit('file',_path,'walk');
					}
					else{
						self.emit('dir',_path,'walk');
					}
					if(self.count < 0){
						self.emit('end');					
					}
				});
			});
		})
	}
	var walker = new Listener();
	walker.on('end',function(){
		callback(this.files);
	});
	walker.walk(mypath);	
}


function getMD5(file,callback){
	var shasum = crypto.createHash('md5');
	var s = fs.ReadStream(file);
	s.on('data', function(d) {
	  shasum.update(d);
	});
	s.on('end', function() {
	  var d = shasum.digest('hex');	 
	  callback(d);
	});
}

function getStatSync(files){
	var output = {};
	files.forEach(function(file){
		var key = path.normalize(file);
		var stat = fs.lstatSync(file);	
		output[file] = stat.mtime;
		if(stat.atime > stat.mtime){
			output[file] = stat.atime
		}
	})
	return output;
}

function listFileSync(rootpath){
    var fpath = rootpath || __dirname;
    var result = [];
    var objArr = fs.readdirSync(fpath);
    for(var i = 0; i < objArr.length; i++){        
        var _file = path.join(fpath,objArr[i]);
        var _stat = fs.statSync(_file);
        if(_stat.isFile()){    
			var filename = _file.split(path.sep).join('/');
            result.push(filename);
        }else{            
            var  _fileArr = listFileSync(_file);    
            for(var j = 0; j < _fileArr.length; j++){    result.push(_fileArr[j]);
            }
        }
    }
    return result;
}


pcs.prototype.toNativePath = function(mypath){
	var self = this;
	if(mypath.indexOf(self.apppath) === 0){
		return mypath.substring(self.apppath.length,mypath.length);
	}
	else{
		return mypath;
	}
}

pcs.prototype.toWebPath = function(mypath){
	var self = this;
	if(mypath.indexOf(self.apppath) === 0){
		return mypath;
	}
	else{
		return self.apppath+mypath;
	}
}

function checkdirSync(pathname){
/**
 * Tool function 
 *
 * because of path.sep,
 * pathname should from path.resolve()
*/	
	var dirname = path.dirname(pathname);
	var patharr = dirname.split(path.sep);
	var newpatharr = [];	
	while( !fs.existsSync(patharr.join(path.sep)) ){
		newpatharr.push(patharr.pop());
	}	
	while(newpatharr.length > 0){
		patharr.push(newpatharr.pop());		
		fs.mkdirSync(patharr.join(path.sep));		
	}	
}

pcs.prototype.getOpts = function(p){
	var prepath = '/rest/2.0/pcs/';	
	var opts = {
		hostname:'pcs.baidu.com',	
		method : p.method || 'GET',
		path : prepath,
	}
	if(p.postdata){
		opts.headers = {
			'host'	: 'pcs.baidu.com:443',
			'content-length' : p.postdata.length,
			'content-type' : 'multipart/form-data'
		}
	}
	if(p.query){
		p.query.path = this.toWebPath(p.query.path);
		opts.path = prepath + p.type + '?' + querystring.stringify(p.query);
	}
	return opts;
}

pcs.prototype.request = function(opts,callback){
	//console.log(opts);
	var req = https.request(opts,function(res){
		var text = "";
		res.on('data',function(data){
			text += data;
		});
		res.on('end',function(){			
			callback(text);
		})
	});
	if(opts.postdata){
		req.write(opts.postdata);
	}
	req.end();	
}