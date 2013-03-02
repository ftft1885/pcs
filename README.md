	var pcs = require('pcs.js');
	var app = new pcs(access_token,yourappname);
	/**
	 * Constructor.
	 *
	 * @param string	baidu pcs access_token
	 * @param string	app path authorized such as myapp not /apps/myapp
	 */

	Api finish:
	
	pcs.getList('myfolder',function(arr){	
		/** 
		 * @param string
		 * @callback Array : file list just below
		*/
	})
	
	pcs.getQuota(function(text){
		/** 		
		 * @callback quota
		*/
	})


	pcs.getTrueList('myfolder',function(text){
		/** 		
		 * @callback true list all below
		*/
	})

	pcs.getFile('myfolder/test.png',function(text){
		/** 		
		 * upload one file
		*/
	})

	pcs.downloadAll({remote:'myfolder',newpath:'newdir'},function(text){
		/** 		
		 * download all
		*/
	})

	pcs.postFile('test.js','posttest',function(text){
		/** 		
		 * upload one file
		 *
		 * @param string native file name
		 + @param string dirname without name
		*/
	})

	pcs.postFileArr(['test.js','pcs.js'],'posttest',function(text){
		/** 		
		 * upload file array
		 *
		 * @param string native file name array
		 + @param string dirname without name
		*/
	})

	pcs.uploadAll('myfolder',function(text){
		/** 		
		 * upload all file in folder
		 *
		 * @param string folder name		
		*/
	})

	pcs.deleteFile('myfolder/test.png',function(text){
		/** 		
		 * delete one file 
		 *
		 * @param string remote file name		
		*/
	})

	pcs.deleteFileArr(['formtest2.js'],function(text){
		/** 		
		 * delete file array
		 *
		 * @param string remote file name array		
		*/
	})

	pcs.syncFolder('myfolder',function(text){
		/** 		
		 * sync one folder
		 *
		 * @param string name of folder to sync	
		*/
	})