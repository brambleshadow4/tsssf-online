import matplotlib.pyplot as plt
from plotHelper import getDataGroupedIntoMonths, addDataLabels

(xs, ys, labels) = getDataGroupedIntoMonths("GamesHosted")
fig = plt.figure()

plt.bar(xs, ys, tick_label=labels)
plt.xlabel("Month")
plt.ylabel("# of Games")
plt.title("TSSSF.net Games per month")
addDataLabels(plt, xs, ys)

plt.show()
