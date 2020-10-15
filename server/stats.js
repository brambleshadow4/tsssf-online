import sqlite3 from "sqlite3";

var sqlite = sqlite3.verbose();

function setup()
{

	var db = new sqlite3.Database('./server/stats.db');
	var sql = `
	CREATE TABLE IF NOT EXISTS GamesHosted (
		id INTEGER PRIMARY KEY,
		timestamp INTEGER
	)`;

	db.all(sql, [], (err, rows) => {});

	sql = `
	CREATE INDEX timestampIndex 
	ON GamesHosted(timestamp)`;

	db.all(sql, [], (err, rows) => {});

	sql = `
	CREATE TABLE IF NOT EXISTS PlayersJoined (
		id INTEGER PRIMARY KEY,
		timestamp INTEGER
	)`;

	db.all(sql, [], (err, rows) => {});

	sql = `
	CREATE INDEX timestampIndex 
	ON PlayersJoined(timestamp)`;

	db.all(sql, [], (err, rows) => {});
}

setup();


export function logGameHosted()
{
	var db = new sqlite3.Database('./server/stats.db');
	var now = new Date().getTime();
	var sql = `INSERT INTO GamesHosted (timestamp) VALUES (?)`;
	db.all(sql, [now], (err, rows) => {});
	db.close();
}

export function logPlayerJoined()
{
	var db = new sqlite3.Database('./server/stats.db');
	var now = new Date().getTime();
	var sql = `INSERT INTO PlayersJoined (timestamp) VALUES (?)`;
	db.all(sql, [now], (err, rows) => {});
	db.close();
}

function timeQuery(db, table, start, end)
{
	return new Promise(function(resolve, reject)
	{
		let query = "SELECT COUNT(timestamp) as count FROM " + table + " WHERE timestamp BETWEEN ? AND ?";

		db.all(query, [start, end],
			function(err, rows){

				if(err)
					reject(err)

				if(rows == undefined)
				{
					resolve("0?");
					return;
				}

				resolve(rows[0].count);
			}
		)

	});
}

export async function getStats()
{

	var dte = new Date();
	var now = dte.getTime();
	var hr1 = now - 60*60*1000;

	var day = dte.getDate();
	var month = dte

	
	var hr24 = now - 24*60*60*1000;


	var week = new Date(now - 24*60*60*1000*dte.getDay());
	week = new Date(week.getFullYear() + "-" + pad(week.getMonth()+1) + "-" + pad(week.getDate()))
	week = week.getTime();

	var month = new Date(dte.getFullYear() + "-" + pad(dte.getMonth()+1) + "-01");
	month = month.getTime();

	var db = new sqlite3.Database('./server/stats.db');



	var stats = await Promise.all([
		timeQuery(db, "PlayersJoined", hr1, now),
		timeQuery(db, "GamesHosted", hr1, now),
		timeQuery(db, "PlayersJoined", hr24, now),
		timeQuery(db, "GamesHosted", hr24, now),
		timeQuery(db, "PlayersJoined", week, now),
		timeQuery(db, "GamesHosted", week, now),
		timeQuery(db, "PlayersJoined", month, now),
		timeQuery(db, "GamesHosted", month, now),
		timeQuery(db, "PlayersJoined", 0, now),
		timeQuery(db, "GamesHosted", 0, now),
	]);

	db.close();

	return {
		"$3": stats[0],
		"$4": stats[1],
		"$5": stats[2],
		"$6": stats[3],
		"$7": stats[4],
		"$8": stats[5],
		"$9": stats[6],
		"$A": stats[7],
		"$B": stats[8],
		"$C": stats[9],
	};

}

function pad(num)
{
	if (num < 10)
		return "0" + num;
	return num;
}