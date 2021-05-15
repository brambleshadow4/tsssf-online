import matplotlib.pyplot as plt
from plotHelper import getDataGroupedIntoDays, cumulateCounts

(xs, ys) = getDataGroupedIntoDays("PlayersJoined")
ys = cumulateCounts(ys)

fig = plt.figure()

plt.plot(xs, ys)
plt.xlabel("Days")
plt.ylabel("# of Players")
plt.title("Total TSSSF.net players over time")

plt.show()
