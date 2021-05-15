import matplotlib.pyplot as plt
from plotHelper import getDataGroupedIntoMonths, addDataLabels

(xs, ys, labels) = getDataGroupedIntoMonths("PlayersJoined")
fig = plt.figure()

plt.bar(xs, ys, tick_label=labels)
plt.xlabel("Month")
plt.ylabel("# of Players")
plt.title("TSSSF.net Players per month")
addDataLabels(plt, xs, ys)

plt.show()
