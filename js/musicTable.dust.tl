<div class="btn btn-primary" id="syncButton">Скачать</div>

{?filesToDelete}
	<h1>Список файлов на удаление</h1>
	<ul>
		{#filesToDelete}
			<li>{.}</li>
		{/filesToDelete}
	</ul>
{/filesToDelete}

<h1>Записи с VK</h1>
<table class="table table-striped table-bordered table-condensed" id="musicTable">
	<thead>
	<th>Плейлист</th>
	<th>Артист</th>
	<th>Название</th>
	</thead>
	<tbody>
		{#vkData.response.items}
		<tr class="{row_class}" data-url="{url}" data-album_name="{album_name}" data-artist="{artist}" data-title="{title}" data-id="{id}">

			<td>{album_name}</td>
			<td>{artist}</td>
			<td>{title}</td>
		</tr>
		{/vkData.response.items}
	</tbody>
</table>