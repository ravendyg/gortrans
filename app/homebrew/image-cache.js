(function iife (win)
{
	'use strict';

	var blobLifeExpectancy = 1000 * 60 * 60 * 24 * 30;	// 30 days

	var dbName = 'gortransLeaflet';
	var storeName = 'map';

	var urlCreator = window.URL || window.webkitURL;

	/**
   * conver a buffer to a string
   */
  function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }

	function str2ab (str)
	{  // to hadle image rsponses
		var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
		var bufView = new Uint8Array(buf);
		for (var i=0, strLen=str.length; i<strLen; i++) {
				bufView[i] = str.charCodeAt(i);
		}
		return buf;
	}

	var getDB = new PromisePoly(
		function (resolve, reject)
		{
			var request = indexedDB.open(dbName, 1);

			request.addEventListener(
				'upgradeneeded',
				function (ev)
				{
					var DB = ev.target.result;

					while (DB.objectStoreNames.length > 0)
					{
						DB.deleteObjectStore( DB.objectStoreNames[0] );
					}

					DB.createObjectStore(storeName);
				}
			);

			request.addEventListener(
				'success',
				function (ev)
				{
					resolve(
						ev.target.result
					);
				}
			);

			request.addEventListener(
				'error',
				function (err)
				{
					reject(err);
				}
			);
		}
	)


	/**
	 * save data into cache
	 */
	var cacheHandler =
	{
		c: null,
		links: null,
		blobs: {},
		DB: null,
		interval: -1,
		/** open DB */
		init: function ()
		{
			this.c = new PromisePoly(
				function (resolve, reject)
				{
					getDB
					.then(
						function (DB)
						{
							cacheHandler.DB = DB;

							var transaction = DB.transaction([storeName], "readwrite");
							var store = transaction.objectStore(storeName);
							var request = store.get('list');
							request.addEventListener(
								'success',
								function ()
								{
									cacheHandler.links = request.result || {};
									// cacheHandler.initLinksSave();
									resolve(true);
								}
							);
							request.addEventListener(
								'error',
								function (err)
								{
									cacheHandler.links = {};
									// cacheHandler.initLinksSave();
									resolve(true);
								}
							);
						}
					)
				}
			);
		},
		/** put request into DB */
		put: function (key, data)
		{
			return new PromisePoly(
				function (resolve, reject)
				{
					// first put in db
					var transaction = cacheHandler.DB.transaction([storeName], "readwrite");
					var store = transaction.objectStore(storeName);
					var request = store.put( { data: data, timestamp: Date.now() }, key);
					request.addEventListener(
						'success',
						function ()
						{
							cacheHandler.links[key] = true;
							resolve( true );
							cacheHandler.saveLinks();
						}
					);
					request.addEventListener(
						'error',
						function (err)
						{
							reject( err );
						}
					);
					// then in memory
					cacheHandler.blobs[key] = data;
				}
			);
		},
		/** get request from DB */
		get: function (key)
		{
			return new PromisePoly(
				function (resolve, reject)
				{	// check memory first
					if ( cacheHandler.blobs[key] )
					{
						resolve( cacheHandler.blobs[key] );
					}
					else
					{
						// then db
						var transaction = cacheHandler.DB.transaction([storeName], "readwrite");
						var store = transaction.objectStore(storeName);
						var request = store.get(key);
						request.addEventListener(
							'success',
							function ()
							{
								if ( request.result && request.result.data )
								{// return data
									var arrayBufferView = str2ab(request.result.data);
									var blob = new Blob( [ arrayBufferView ], { type: "image/png" } );
									resolve( request.result.data );
								}
								else
								{
									reject();
								}
								// then check is it up to date
								if (
									!request.result ||
									!request.result.data ||
									request.result.timestamp + blobLifeExpectancy < Date.now()
								)
								{	// doesn't exist or to old, try to replace
									cacheHandler._http(key);
								}
							}
						);
						request.addEventListener(
							'error',
							function (err)
							{
								reject( err );
							}
						);
					}
				}
			);
		},

		fetch: function (link)
		{
			return new PromisePoly(
				function (resolve, reject)
				{
					cacheHandler.c
					.then(
						function ()
						{
							if (cacheHandler.links[link])
							{
								cacheHandler.get(link)
								.then(
									function (blob)
									{
										var url = urlCreator.createObjectURL( blob );
										resolve(url);
									}
								)
								.catch(
									function (err)
									{	// don't expect normally be here
										// reload
										cacheHandler._http(link)
										.then(
											function (blob)
											{
												var url = urlCreator.createObjectURL( blob );
												resolve(url);
											}
										);
									}
								)
								;
							}
							else
							{
								cacheHandler._http(link)
								.then(
									function (blob)
									{
										var url = urlCreator.createObjectURL( blob );
										resolve(url);
									}
								);
							}
						}
					);
				}
			);
		},

		_http: function (link)
		{
			return new PromisePoly(
				function (resolve, reject)
				{
					if ( navigator['network'].connection.type.toLowerCase().match('no network') )
					{
						reject('no connection');
					}
					else
					{
						var xhr = new XMLHttpRequest();
						xhr.open( "GET", link, true );

						xhr.responseType = "arraybuffer";

						xhr.onload = function( e ) {
							var blob = new Blob( [ this.response ], { type: "image/png" } );
							var arrayBufferView = new Uint8Array( this.response );

							// make a string to put into db
							var respStr = ab2str(arrayBufferView);
							cacheHandler.put(link, respStr);

							resolve(blob);
						};

						xhr.onerror = function (e) {
							console.error(e);
						}

						xhr.send();
					}
				}
			);
		},

		// initLinksSave: function ()
		// {
		// 	cacheHandler.interval = setInterval(
		// 		function ()
		// 		{
		// 			cacheHandler.saveLinks();
		// 		},
		// 		1000 * 60 * 5
		// 	);
		// 	window.addEventListener(
		// 		'beforeunload',
		// 		function ()
		// 		{
		// 			cacheHandler.saveLinks();
		// 		}
		// 	);
		// },

		saveLinks: function ()
		{
			var transaction = cacheHandler.DB.transaction([storeName], "readwrite");
			var store = transaction.objectStore(storeName);
			var request = store.put(cacheHandler.links, 'list');
		}
	}
	cacheHandler.init();

	win['imageCache'] = cacheHandler;

})(window);