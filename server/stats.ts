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


	sql = `
	CREATE TABLE IF NOT EXISTS PotentialPlayers (
		id VARCHAR(255),
		platform VARCHAR(255),
		name VARCHAR(255),
		avatarURL VARCHAR(255),
		timezone VARCHAR(255),
		expireAt INTEGER
	)`;
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

function timeQuery(db: sqlite3.Database, table: string, start:number, end:number): Promise<number>
{
	return new Promise(function(resolve, reject)
	{
		let query = "SELECT COUNT(timestamp) as count FROM " + table + " WHERE timestamp BETWEEN ? AND ?";

		db.all(query, [start, end],
			function(err, rows:any[]){

				if(err)
				{
					reject(err)
					return;
				}

				if(rows == undefined)
				{
					reject("rows is undefined")
					return;
				}

				resolve(rows[0].count);
			}
		)

	});
}

function startOfTodayUTC(dte: Date)
{
	var d = new Date(dte.getTime() + dte.getTimezoneOffset()*60*1000 + 2000);
	d = new Date(d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()))
	return d;
}

function utcDay(dte: Date)
{
	return new Date(dte.getTime() + dte.getTimezoneOffset()*60*1000);
}

export type GameStats = {
	"$3": number,
	"$4": number,
	"$5": number,
	"$6": number,
	"$7": number,
	"$8": number,
	"$9": number,
	"$A": number,
	"$B": number,
	"$C": number,
	"gamesHostedThisWeek": number[],
	"playersJoinedThisWeek": number[]
}


export async function getStats(): Promise<GameStats>
{

	var dte = new Date();
	var now = dte.getTime();
	var hr1 = now - 60*60*1000;

	var day = dte.getDate();
	var month = dte

	var hr24 = now - 24*60*60*1000;

	var utc = utcDay(dte);

	var today = startOfTodayUTC(dte);
	var todayNum = today.getTime();
	var week =  today.getTime() - 24*60*60*1000*utc.getDay()
	
	var dayLen = 24*60*60*1000;

	month = new Date(utc.getFullYear() + "-" + pad(utc.getMonth()+1) + "-01");
	var monthNum = month.getTime();

	var db = new sqlite3.Database('./server/stats.db');

	var stats = await Promise.all([
		timeQuery(db, "PlayersJoined", hr1, now),
		timeQuery(db, "GamesHosted", hr1, now),
		timeQuery(db, "PlayersJoined", hr24, now),
		timeQuery(db, "GamesHosted", hr24, now),
		timeQuery(db, "PlayersJoined", week, now),
		timeQuery(db, "GamesHosted", week, now),
		timeQuery(db, "PlayersJoined", monthNum, now),
		timeQuery(db, "GamesHosted", monthNum, now),
		timeQuery(db, "PlayersJoined", 0, now),
		timeQuery(db, "GamesHosted", 0, now),
		//
		timeQuery(db, "GamesHosted", todayNum, now),
		timeQuery(db, "GamesHosted", todayNum-dayLen, todayNum),
		timeQuery(db, "GamesHosted", todayNum-dayLen*2, todayNum-dayLen),
		timeQuery(db, "GamesHosted", todayNum-dayLen*3, todayNum-dayLen*2),
		timeQuery(db, "GamesHosted", todayNum-dayLen*4, todayNum-dayLen*3),
		timeQuery(db, "GamesHosted", todayNum-dayLen*5, todayNum-dayLen*4),
		timeQuery(db, "GamesHosted", todayNum-dayLen*6, todayNum-dayLen*5),

		timeQuery(db, "PlayersJoined", todayNum, now),
		timeQuery(db, "PlayersJoined", todayNum-dayLen, todayNum),
		timeQuery(db, "PlayersJoined", todayNum-dayLen*2, todayNum-dayLen),
		timeQuery(db, "PlayersJoined", todayNum-dayLen*3, todayNum-dayLen*2),
		timeQuery(db, "PlayersJoined", todayNum-dayLen*4, todayNum-dayLen*3),
		timeQuery(db, "PlayersJoined", todayNum-dayLen*5, todayNum-dayLen*4),
		timeQuery(db, "PlayersJoined", todayNum-dayLen*6, todayNum-dayLen*5),



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
		"gamesHostedThisWeek": stats.slice(10,17),
		"playersJoinedThisWeek": stats.slice(17,24)
	};

}

function pad(num: number)
{
	if (num < 10)
		return "0" + num;
	return num;
}


export async function getPotentialPlayers()
{
	return new Promise((resolve, reject) =>
	{
		var db = new sqlite3.Database('./server/stats.db');
		let now = new Date().getTime();

		let sql = `SELECT * FROM PotentialPlayers WHERE expireAt > ` + now;
		db.all(sql, [], (err, rows) => {

			resolve(rows);

		});

		sql = `DELETE FROM PotentialPlayers WHERE expireAt <= ` + now;

		db.all(sql, [], (err, rows) => {});
	});
}

export async function addPotentialPlayer(id: string, platform: "discord", name: string, avatarURL: string, timezone: string, expireAt: number)
{
	console.log(arguments)

	return new Promise((resolve, reject) =>
	{
		var db = new sqlite3.Database('./server/stats.db');

		db.all(`INSERT INTO PotentialPlayers (id, platform, name, avatarURL, timezone, expireAt) VALUES (?, ?, ?, ?, ?, ?)`, [id, platform, name, avatarURL, timezone, expireAt], (err, rows) => {

			resolve(rows);
		});

	});
}

export async function removePotentialPlayer(id: string, platform: "discord")
{
	console.log(id);
	return new Promise((resolve, reject) =>
	{
		var db = new sqlite3.Database('./server/stats.db');

		db.all(`DELETE FROM PotentialPlayers WHERE id = ? AND platform = ?`, [id, platform], (err, rows) => {

			resolve(rows);
		});

	});
}