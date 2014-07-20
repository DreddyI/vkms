// где-то в коде надо
Array.prototype.search = function (needle) {

	for (var key in this) {
		if(this.hasOwnProperty(key)){
			if (this[key] == needle) {
				return key;
			}
		}
	}

	return false;
};

// главная магия
(function(){

	var
		userId, //чё правда комментировать?
		token, // токен для авторизации вк
		self = this,// хуй знает зачем, но так модно
		interval, // переменная для интервала опроса вкшного попапа
		albums = {}, // сюда мы положим инфу о альбомах
		w, // хендлер вкшного попапа
		fs = require('fs'),// фс, ёба
		filesToDelete, // здесь будет список с файлами для удаления
//		http = require('http'),
		http = require('follow-redirects').http,// поскольку вк мутит редиректы, а нодовский хуй их не понимает,
												// нам нужна левая либа, которая это умеет
		urlParse = require('url').parse; // урлы попарсить

	/**
	 * вызывается, когда данные о песенках пришли, рисует табличку, убирает из списка удаления существующие в вк песни
	 * @param data
	 */
	function renderTableSuccess(data){

		var filename;

		for (var i in data.response.items)
			if(data.response.items.hasOwnProperty(i)){
				if (typeof albums['album' + data.response.items[i].album_id] != 'undefined'){
					data.response.items[i].album_name = albums['album' + data.response.items[i].album_id].title;
				}else{
					data.response.items[i].album_name = 'unsorted';
				}

				filename = purifyFilename(data.response.items[i].artist, data.response.items[i].title);

				if (fs.existsSync('music/'+ data.response.items[i].album_name +'/' + filename)){

					var indexInFilesToDelete = filesToDelete.search('music/'+ data.response.items[i].album_name +'/' + filename);
					if(indexInFilesToDelete !== false){
						filesToDelete.splice(indexInFilesToDelete, 1);
					}

					data.response.items[i].row_class = 'success';

				}else{

					data.response.items[i].row_class = 'info';

				}

			}

		dust.render('musicTable', {vkData: data, filesToDelete: filesToDelete}, function(err, out){$('body').html(out);})

	}

	/**
	 * написано же: гружу альбомы
	 */
	function loadAlbums(){
		$('body').append($('<h1>Гружу альбомы</h1>'));
		$.ajax({
			url: 'https://api.vk.com/method/audio.getAlbums?access_token='+token+'&owner_id='+userId+'&v=5.23&test_mode=1&lang=ru',
			type: 'POST',
			success: loadAlbumsSuccess
		});
	}

	/**
	 * коллбэк для "гружу альбомы", запрашивает песни
	 * @param data
	 */
	function loadAlbumsSuccess(data){

		for (var i in data.response.items)
			if(data.response.items.hasOwnProperty(i)){
				albums['album' + data.response.items[i].id] = data.response.items[i];
			}

		$('body').append($('<h1>Гружу записи</h1>'));
		$.ajax({
			url: 'https://api.vk.com/method/audio.get?access_token='+token+'&owner_id='+userId+'&v=5.23&test_mode=1&lang=ru',
			type: 'POST',
			success: renderTableSuccess
		});
	}

	/**
	 * коллбэк для интервала опроса вкшного попапа
	 */
	function intervalCallback(){

		var wLocation = w.document.location;

		if (wLocation.host == "oauth.vk.com" && wLocation.pathname == "/blank.html"){
			clearInterval(interval);
			var hash = wLocation.hash.substr(1);
			var vars = require('querystring').parse(hash);
			token = vars.access_token;
			userId = vars.user_id;
			w.close();
			scanLocalFiles();
		}

	}

	/**
	 * сканируем файло и пишем его в список удаления,
	 * позднее список будет профильтрован на предмет существующих в вк песен
	 */
	function scanLocalFiles(){

		$('body').html('<h1>Сканирую файлы</h1>');

		filesToDelete = [];

		fs.readdir('music', function(err, albums){

			if (err){
				console.error('readdir/music', err.message);
				loadAlbums();
				return;
			}

			var scanSubDir = function(i){

				fs.readdir('music/'+ albums[i], function(err2, files){

					for(var j in files){
						if(files.hasOwnProperty(j)){
							filesToDelete.push('music/'+ albums[i] + '/' + files[j]);
						}
					}

					if(i + 1 == albums.length){
						loadAlbums();
					}else{
						scanSubDir(i + 1);
					}

				})

			};

			scanSubDir(0);
		});


	}

	/**
	 * кто-то нажал на кнопку логина
	 */
	function onOpenWindowButtonClick(){

		$(this).attr('disabled', true);
		w = window.open('https://oauth.vk.com/authorize?client_id=4462491&scope=audio&display=popup&v=5.23&response_type=token');
		interval = setInterval(intervalCallback, 100);

	}

	/**
	 * даунлоадер
	 */
	var download = (function(){

		var tasks = [], running = 0;

		/**
		 * соб-но загрузка
		 * @param url
		 * @param dest
		 * @param id
		 */
		function doDownload(url, dest, id){

			console.log("качаю "+ dest);

			var $musicTable = $('#musicTable');

			$(window).scrollTop(
				$musicTable.find('tbody tr[data-id="'+ id +'"]').position().top
					+ $musicTable.find('tbody tr[data-id="'+ id +'"]').height()
					- window.innerHeight
			);
			$musicTable.find('tbody tr[data-id="'+ id +'"]')
				.after(
					$('<tr>', {class: "progress-bar-row", id: 'progress-bar'+ id})
						.append($('<td>', {colspan: 3})
							.append($('<div>', {class: "progress"})
								.append($('<div>', {
									class: "progress-bar",
									role: "progressbar",
									'aria-valuenow': 0,
									'aria-valuemin': 0,
									'aria-valuemax': 100,
									style: "width: 0%;"
								})
									.append($('<span>', {style: 'white-space: nowrap'}).text('0'))
								)
							)
						)
				);

			var parsedUrl = urlParse(url);


			http.get({
				host: parsedUrl.host,
				hostname: parsedUrl.hostname,
				path: parsedUrl.path,
				port: parsedUrl.port,
				maxRedirects: 10,
				headers: {
					'user-agent': 'Mozilla/5.0',
					'referer': 'https://vk.com/'

				}
			}, function (res) {

				var current = 0, total = parseInt(res.headers['content-length']);
				res.on("data", function (chunk) {
					current += chunk.length;
					var progress = Math.round(100 * current / total);
					$('#progress-bar' + id)
						.find('div.progress > div.progress-bar')
						.attr('aria-valuenow', progress)
						.width(progress + '%')
						.children('span')
						.text(current + ' / ' + total);
				});

				var file = fs.createWriteStream(dest);
				res.pipe(file);
				file.on('finish', function () {
					file.close(function () {
						console.log(dest + ' скачался');
						$('#progress-bar' + id).remove();
						$musicTable
							.find('tbody tr[data-id="' + id + '"]')
							.removeClass('info')
							.addClass('success')
						;
						doTicker();
					});
				});

			}).on('error', function (err) {
				console.error(err);
				$('#progress-bar' + id).remove();
				$musicTable
					.find('tbody tr[data-id="' + id + '"]')
					.removeClass('info')
					.addClass('danger')
				;
				doTicker();
			});

		}

		/**
		 * менеджер очереди
		 */
		function doTicker(){

			if(tasks.length > 0){
				running++;
				var task = tasks.shift();
				doDownload(task.url, task.dest, task.id);
			}else{
				console.log('очередь пуста');
				running--;
				if(running == 0)
					scanLocalFiles();
			}

		}

		/**
		 * тут принимаются файлы на загрузку, соб-но интерфейс даунлоадера
		 */
		return function (url, dest, id) {

			console.log("пихаю файл "+ dest +" в очередь");
			tasks.push({url:url, dest:dest, id:id});
			if (running < 5)
				doTicker();

		}
	})();

	/**
	 * режем из имени файла левые символы и приводим его в стандартный вид
	 * @param artist
	 * @param title
	 * @returns {string}
	 */
	function purifyFilename(artist, title){

		return (artist + ' - ' + title).replace(/[^A-Za-zа-яА-ЯёЁ0-9_!~=+'\(\)\[\],\.-]/g, ' ').replace(/\s+/g, ' ').trim() + '.mp3';

	}

	/**
	 * пора грузить файло
	 */
	function onSyncButtonClick(){

		$(this).attr('disabled', true);

		for(var i in filesToDelete){
			if(filesToDelete.hasOwnProperty(i)){
				fs.unlink(filesToDelete[i]);
			}
		}

		$('#musicTable').find('tbody tr.info').each(function(i, e){

			try {
				fs.mkdirSync('music');
			}catch (ex){
			}
			try {
				fs.mkdirSync('music/'+ $(e).data('album_name'));
			}catch (ex){
			}
			download(
				$(e).data('url'),
				'music/'+ $(e).data('album_name') +'/'+ purifyFilename($(e).data('artist'), $(e).data('title')),
				$(e).data('id')
			);

		});

	}

	/**
	 * регаем ивенты
	 */
	$(document)
		.on('click', '#openWindow', onOpenWindowButtonClick)
		.on('click', '#syncButton', onSyncButtonClick)
		.on('click', '#musicTable tbody tr[data-id]', function(){$(this).toggleClass('info');})
	;


})();