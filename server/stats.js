import sqlite3 from "sqlite3";

var sqlite = sqlite3.verbose();

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

export function logGameHosted()
{
	var now = new Date().getTime();
	var sql = `INSERT INTO GamesHosted (timestamp) VALUES (?)`;
	db.all(sql, [now], (err, rows) => {});
}

export function logPlayerJoined()
{
	var now = new Date().getTime();
	var sql = `INSERT INTO PlayersJoined (timestamp) VALUES (?)`;
	db.all(sql, [now], (err, rows) => {});
}