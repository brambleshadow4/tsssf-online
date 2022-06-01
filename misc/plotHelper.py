
import sqlite3
from datetime import datetime,timedelta

def getMonthLabel(month, year):

	if (month - 1) % 3 == 0:

		return ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month] + " '" + str(year - 2000)
	else:
		return ""

def getDataGroupedIntoMonths(tableName):

	db = sqlite3.connect('./stats.db')
	rawTimestamps = []


	for row in db.execute("SELECT * FROM " + tableName + " ORDER BY timestamp"):
		(a,ts) = row

		rawTimestamps.append(datetime.utcfromtimestamp(ts/1000))

	ys = []
	labels = []
	month = rawTimestamps[0].month
	year = rawTimestamps[0].year
	currentCount = 0

	for d in rawTimestamps:

		while True:

			if d.month == month and d.year == year:
				currentCount += 1
				break
			else:

				ys.append(currentCount)
				labels.append(getMonthLabel(month, year))
				currentCount = 0

				month += 1

				if month > 12:
					year += 1
					month = 1


	ys.append(currentCount)
	labels.append(getMonthLabel(month, year))

	xs = list(range(0, len(labels)))

	return (xs, ys, labels)

def getDataGroupedIntoDays(tableName):

	db = sqlite3.connect('./stats.db')
	rawTimestamps = []


	for row in db.execute("SELECT * FROM " + tableName + " ORDER BY timestamp"):
		(a,ts) = row

		rawTimestamps.append(datetime.utcfromtimestamp(ts/1000))

	ys = []

	datePtr = rawTimestamps[0]

	currentCount = 0

	for d in rawTimestamps:

		while True:

			if d.month == datePtr.month and d.year == datePtr.year and d.day == datePtr.day:
				currentCount += 1
				break
			else:

				ys.append(currentCount)
				currentCount = 0
				datePtr = datePtr + timedelta(days=1)


	ys.append(currentCount)
	xs = list(range(0, len(ys)))

	return (xs, ys)

def cumulateCounts(arr):

	for i in range(1,len(arr)):
		arr[i] = arr[i] + arr[i-1]

	return arr

def addDataLabels(plt, xs, ys):
	for x,y in zip(xs,ys):

		label = y

		plt.annotate(
			label, # this is the text
			(x,y), # this is the point to label
			textcoords="offset points", # how to position the text
			xytext=(0,2), # distance from text to points (x,y)
			ha='center') # horizontal alignment can be left, right or center
