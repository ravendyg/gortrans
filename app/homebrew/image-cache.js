(function iife (win)
{
	'use strict';

	var dbName = 'gortransLeaflet';
	var storeName = 'map';

	var urlCreator = window.URL || window.webkitURL;

	var getDB = new Promise(
		(resolve, reject) =>
		{
			var request = indexedDB.open(dbName, 1);

			request.addEventListener(
				'upgradeneeded',
				ev =>
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
				ev =>
				{
					resolve(
						ev.target.result
					);
				}
			);

			request.addEventListener(
				'error',
				err =>
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
		DB: null,
		interval: -1,
		/** open DB */
		init ()
		{
			this.c = new Promise(
				(resolve, reject) =>
				{
					getDB
					.then(
						DB =>
						{
							cacheHandler.DB = DB;

							const transaction = DB.transaction([storeName], "readwrite");
							const store = transaction.objectStore(storeName);
							const request = store.get('list');
							request.addEventListener(
								'success',
								() =>
								{
									cacheHandler.links = request.result || {};
									cacheHandler.initLinksSave();
									resolve(true);
								}
							);
							request.addEventListener(
								'error',
								err =>
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
				(resolve, reject) =>
				{
					const transaction = cacheHandler.DB.transaction([storeName], "readwrite");
					const store = transaction.objectStore(storeName);
					const request = store.put(data, key);
					request.addEventListener(
						'success',
						() =>
						{
							cacheHandler.links[key] = true;
							resolve( true );
						}
					);
					request.addEventListener(
						'error',
						err =>
						{
							reject( err );
						}
					);
				}
			);
		},
		/** get request from DB */
		get (key)
		{
			return new Promise(
				(resolve, reject) =>
				{
					const transaction = cacheHandler.DB.transaction([storeName], "readwrite");
					const store = transaction.objectStore(storeName);
					const request = store.get(key);
					request.addEventListener(
						'success',
						() =>
						{
							resolve( request.result );
						}
					);
					request.addEventListener(
						'error',
						err =>
						{
							reject( err );
						}
					);
				}
			);
		},

		fetch (link)
		{
			return new Promise(
				(resolve, reject) =>
				{
					cacheHandler.c
					.then(
						() =>
						{
							if (cacheHandler.links[link])
							{
								cacheHandler.get(link)
								.then(
									blob =>
									{
										resolve(
											urlCreator.createObjectURL( blob )
										);
									}
								)
							}
							else
							{
								var xhr = new XMLHttpRequest();
								xhr.open( "GET", link, true );

								xhr.responseType = "arraybuffer";

								xhr.onload = function( e ) {
									var blob = new Blob( [ this.response ], { type: "image/png" } );
									cacheHandler.put(link, blob);

									resolve(
										urlCreator.createObjectURL( blob )
									);
								};

								xhr.onerror = function (e) {
									console.error(e);
								}

								xhr.send();
							}
						}
					);
				}
			);
		},

		initLinksSave ()
		{
			cacheHandler.interval = setInterval(
				() => cacheHandler.saveLinks(),
				1000 * 60 * 5
			);
			window.addEventListener(
				'beforeunload',
				() => cacheHandler.saveLinks()
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