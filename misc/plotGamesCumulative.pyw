import matplotlib.pyplot as plt
from plotHelper import getDataGroupedIntoDays, cumulateCounts

(xs, ys) = getDataGroupedIntoDays("GamesHosted")
ys = cumulateCounts(ys)

fig = plt.figure()

plt.plot(xs, ys)
plt.xlabel("Days")
plt.ylabel("# of Games")
plt.title("Total TSSSF.net games over time")

plt.show()
