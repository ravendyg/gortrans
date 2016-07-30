(function iife (win)
{
	'use strict';

	var blobLifeExpectancy = 1000 * 60 * 60 * 24 * 30;	// 30 days

	var dbName = 'gortransLeaflet';
	var storeName = 'map';

	var urlCreator = window.URL || window.webkitURL;

	var getDB = new Promise(
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
	const cacheHandler =
	{
		c: null,
		links: null,
		blobs: {},
		DB: null,
		interval: -1,
		/** open DB */
		init ()
		{
			this.c = new Promise(
				function (resolve, reject)
				{
					getDB
					.then(
						function (DB)
						{
							cacheHandler.DB = DB;

							const transaction = DB.transaction([storeName], "readwrite");
							const store = transaction.objectStore(storeName);
							const request = store.get('list');
							request.addEventListener(
								'success',
								function ()
								{
									cacheHandler.links = request.result || {};
									cacheHandler.initLinksSave();
									resolve(true);
								}
							);
							request.addEventListener(
								'error',
								function (err)
								{
									cacheHandler.links = {};
									cacheHandler.initLinksSave();
									resolve(true);
								}
							);
						}
					)
				}
			);
		},
		/** put request into DB */
		put (key, data)
		{
			return new Promise(
				function (resolve, reject)
				{
					// first put in db
					const transaction = cacheHandler.DB.transaction([storeName], "readwrite");
					const store = transaction.objectStore(storeName);
					const request = store.put( { data, timestamp: Date.now() }, key);
					request.addEventListener(
						'success',
						function ()
						{
							cacheHandler.links[key] = true;
							resolve( true );
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
		get (key)
		{
			return new Promise(
				function (resolve, reject)
				{	// check memory first
					if ( cacheHandler.blobs[key] )
					{
						resolve( cacheHandler.blobs[key] );
					}
					else
					{
						// then db
						const transaction = cacheHandler.DB.transaction([storeName], "readwrite");
						const store = transaction.objectStore(storeName);
						const request = store.get(key);
						request.addEventListener(
							'success',
							function ()
							{
								if ( request.result && request.result.data )
								{// return data
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

		fetch (link)
		{
			return new Promise(
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
										resolve(
											urlCreator.createObjectURL( blob )
										);
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
												resolve(
													urlCreator.createObjectURL( blob )
												);
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
										resolve(
											urlCreator.createObjectURL( blob )
										);
									}
								);
							}
						}
					);
				}
			);
		},

		_http (link)
		{
			return new Promise(
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
							cacheHandler.put(link, blob);

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

		initLinksSave ()
		{
			cacheHandler.interval = setInterval(
				function ()
				{
					cacheHandler.saveLinks();
				},
				1000 * 60 * 5
			);
			window.addEventListener(
				'beforeunload',
				function ()
				{
					cacheHandler.saveLinks();
				}
			);
		},

		saveLinks ()
		{
			const transaction = cacheHandler.DB.transaction([storeName], "readwrite");
			const store = transaction.objectStore(storeName);
			const request = store.put(cacheHandler.links, 'list');
		}
	}
	cacheHandler.init();

	win['imageCache'] = cacheHandler;

})(window);