/*
 * alicorn
 * alt-timeline
 * breaking-ships
 * chain
 * changeling
 * clone
 * copy
 * disconnected-cards
 * gender-change
 * goals
 * keyword-change
 * love-poison
 * male-female
 * new-goal
 * play-from-discard
 * play-pony
 * play-ship
 * pony-action
 * princess
 * race-change
 * replace
 * search
 * swap
 * turn-order
 * two-pony-card
 */
export default {
	"Core.Pony.Aloe": {
		"heading": "",
		"questions": [
			"<div class='question'>Can two-pony cards count as the same pony twice, or just two one-pony cards in the same spot?</div><div class='answer'>Two-pony cards do not count as two of the same pony; they're a team of two different ponies!</div>"
		]
	},
	"two-pony-card": {
		"heading": "Double Pony Cards",
		"questions": [
			"<div class='question'>Can two-pony cards count as the same pony twice, or just two one-pony cards in the same spot?</div><div class='answer'>Two-pony cards do not count as two of the same pony; they're a team of two different ponies!</div>",
			"<div class='question'>Can a changeling become a 2-Pony card, like Aloe & Lotus?</div><div class='answer'>A changeling can become only a single pony. So it can become Aloe, but not Lotus, or the other way around.</div>",
			"<div class='question'>When you ship a card to Flim/Flam or Aloe/Lotus, does that count as 2 ships?</div><div class='answer'>Yes. Two ponies and two ships. As a side note, any card that changes one of the attributes of a Pony card (e.g. gender, race) will change that attribute for both Flim/Flam at the same time. So there's no way for a single card to have both a female Flim and a male Flam.</div>",
			"<div class='question'>What if you ship Flim & Flam with Aloe & Lotus? How many ships is that?</div><div class='answer'>To keep things simple, it still only counts as 2 ships.</div>",
			"<div class='question'>OK, I think the card text makes this perfectly clear. But does a Gender Change or Race Change affect both ponies on a two-pony card?</div><div class='answer'>They do!</div>",
			"<div class='question'>Since Race-change ships affect both ponies on a two-pony card, does that mean shipping Nightmare Moon with pricessified Aloe & Lotus fulfills Princess Pile?</div><div class='answer'>Indeedy!</div>",
			"<div class='question'>It says the player \"may choose one Pony card attached to this Ship. Until the end of your turn, that Pony card counts as two ponies.\" Well, can we choose Aloe & Lotus and make that card four ponies?</div><div class='answer'>Any Pony CARD you choose will count as two Ponies. Since Aloe & Lotus is a single Pony card, it will simply continue to be two Ponies.</div>"
		]
	},
	"Core.Pony.AloeAndLotus": {
		"heading": "",
		"questions": [
			"<div class='question'>Can a changeling become a 2-Pony card, like Aloe & Lotus?</div><div class='answer'>A changeling can become only a single pony. So it can become Aloe, but not Lotus, or the other way around.</div>"
		]
	},
	"changeling": {
		"heading": "Changelings",
		"questions": [
			"<div class='question'>Can a changeling become a 2-Pony card, like Aloe & Lotus?</div><div class='answer'>A changeling can become only a single pony. So it can become Aloe, but not Lotus, or the other way around.</div>",
			"<div class='question'>The Wonderbolts card says \"counts as a single pony\", and the Changeling card says \"becomes a copy of any single [pegasus symbol] of your choice\". Does this mean the changeling card can be used as a copy of the Wonderbolts?</div><div class='answer'>A changeling can become a member of the Wonderbolts, yep!</div>",
			"<div class='question'>Do changelings only copy ponies on the board or ANY pony at all (player's choice)?</div><div class='answer'>The changelings can copy any pony in the game - but are restricted to their race. Chrysalis, for example, can only become alicorns!</div>",
			"<div class='question'>A question on changelings! I know disguises only last for the player's turn, but what about if you ship something to a changeling on another turn and it doesn't have a disguise up? I'm assuming it still counts as itts race, but what about gender? They're unique in having no gender. And if I Rule 63 such a changeling, does it stay at 'no gender' or does it go all the way to the other end of the spectrum and become both male and female?</div><div class='answer'>It does not count as anything but a null card -- which is why their symbols are black! The only exception is that Chrysalis counts as a female. Introducing a Rule 63 card to a non-gendered changeling does not introduce a gender to them, alas!</div>",
			"<div class='question'>Can you ship the Wonderbolts (Who can become any sex) and a Pegasi Changeling (Who gain the Characteristics of the Wonderbolts) and count that towards the Goals Budding Curiosity or Charity Auction?.</div><div class='answer'>Interesting question! <del>I'd say probably yes.</del><ins>Gender is implemented as a set in tsssf.net. Male cards are {\"male\"}, female cards are {\"female\"}, the wonderbolts is {\"male\",\"female\"} and (most) changelings are {}. We can thus define the opposite gender as the complimentary set which would imply {\"male\", \"female\"} and {} are opposites, however the FAQ states that gender swap cards do not apply to no gender/both gender cards. It does not say whether these cards have no opposite, or whether they are an opposite to themself. tsssf.net interprets this as those cards have no opposite, and as such, the Wonderbolts cannot be gender swapped nor be shipped with an opposite gendered self.</ins></div>",
			"<div class='question'>Can you change a changeling's race?</div><div class='answer'>Race change cards do not affect what race a Changeling can become, but it can change the race of a Changeling after it's changed. For example, an Earth Pony Changeling can become an Alicorn Pinkie Pie.</div>",
			"<div class='question'>The rules say as an example that an earth Changeling can become an alicorn Pinkie Pie (in one move, by becoming an earth Pinkie then having her race changed). But if a Pinkie on the board becomes an alicorn for the turn, does that allow Chrysalis to become an alicorn Pinkie Pie?</div><div class='answer'>While this is technically allowed by the wording of the cards, I'm not sure it goes with the spirit of the cards. However, I also don't see it being very abusive. Go with whatever your group decides!</div>",
			"<div class='question'>My First Slash. Can it really be won if you use the unicorn changling to stand in for Shining Armor?</div><div class='answer'>Yes.</div>",
			"<div class='question'>Changelings gain all of the symbols of the card they mimic. Does that mean that if Queen Chrysalis (who is already female) mimics Discord, she gains the male symbol and counts as both a male and a female simultaneously?</div><div class='answer'><del>This was not our original intention, but I believe you're correct! By default, symbols and keywords are not replaced when others are gained, so Chrysalis would become a Discord who is both male and female at the same time.</del><ins>When a changeling gains a symbol, it replaces its previous symbol. When a changeling gains a name/keyword, it gains them in additional to its original name/keywords.</ins></div>",
			"<div class='question'>Changelings don't gain powers, but what if one mimics the Wonderbolts? Does that combined male/female gender symbol imply that it can be either gender anyway?</div><div class='answer'>A Changeling copying the Wonderbolts earns their symbol, so they have the same ability.</div>",
			"<div class='question'>Do Changelings' Powers only activate on the turn they are played, and when they are moved, or on every turn?</div><div class='answer'>Changeling powers are activated only when they're played, when they're moved, when their power is activated by connecting them to an adjacent pony with a Ship card, or when a power might activate another pony's power. They don't activate every turn.</div>",
			"<div class='question'>I play a Changeling copying a pony on the grid, then use a Swap power to swap the 'ling with the original. Does this count as breaking up the ship?</div><div class='answer'>Yep! It's still a different Pony, even if it's the same ... pony.</div>",
			"<div class='question'>What happens when I play a Gender Change ship on a multi-gendered card, like the Wonderbolts? What about on a non-gendered card, like a changeling?</div><div class='answer'>A Gender Change ship has no effect on a multi-gendered Pony card, or on a Pony card with no gender.</div>",
			"<div class='question'>If a pony, say, Cheerilee, is shipped with, say, Discord, and also shipped with Queen Chrysalis who is disguised as Discord, is that eligible for the pony-with-two-versions-of-another-pony goal or no since to Cheerilee it would just seem like two of the same version of Discord?</div><div class='answer'>Yep! For the sake of ease and keeping things simple in the long run, a disguised changeling counts as a \"different version\" of another pony.</div>"
		]
	},
	"race-change": {
		"heading": "Race Change",
		"questions": [
			"<div class='question'>OK, I think the card text makes this perfectly clear. But does a Gender Change or Race Change affect both ponies on a two-pony card?</div><div class='answer'>They do!</div>",
			"<div class='question'>Can you change a changeling's race?</div><div class='answer'>Race change cards do not affect what race a Changeling can become, but it can change the race of a Changeling after it's changed. For example, an Earth Pony Changeling can become an Alicorn Pinkie Pie.</div>",
			"<div class='question'>The rules say as an example that an earth Changeling can become an alicorn Pinkie Pie (in one move, by becoming an earth Pinkie then having her race changed). But if a Pinkie on the board becomes an alicorn for the turn, does that allow Chrysalis to become an alicorn Pinkie Pie?</div><div class='answer'>While this is technically allowed by the wording of the cards, I'm not sure it goes with the spirit of the cards. However, I also don't see it being very abusive. Go with whatever your group decides!</div>",
			"<div class='question'>Since Race-change ships affect both ponies on a two-pony card, does that mean shipping Nightmare Moon with pricessified Aloe & Lotus fulfills Princess Pile?</div><div class='answer'>Indeedy!</div>",
			"<div class='question'>If a pony card has one of its attributes changed (e.g. gender, race, keyword) and then it's moved to another spot on the grid, does it keep that change? What if it's discarded?</div><div class='answer'>The card keeps that attribute change even if it's moved or discarded. So you can change Big Mac into a princess, discard him, pull him back into your hand, and then play him again with a normal ship, and he'll be just as fabulously princessy as before.</div>",
			"<div class='question'>Do alicorns count as a race for the purpose of Race Changing ships?</div><div class='answer'>Yes! There are four different races, represented by the Race symbol: Earth Pony, Unicorn, Pegasus, and Alicorn. In terms of game mechanics, they can all be swapped interchangeably with any power that can change a card's race.</div>",
			"<div class='question'>I played a unicorn from my hand, and then later turned it into an alicorn. Does that count as playing an alicorn from my hand?</div><div class='answer'>Yes. At that moment, the card satisfies the two conditions of \"alicorn\" and \"played from the hand\".</div>",
			"<div class='question'>I'm a little confused as to the order in which Ship and Pony cards activate. I had a situation where I wanted to use a race-changing ship card and attach a new pony with a swap power, and the order of operations mattered.</div><div class='answer'>The order of operations is thus: you play the ship card, then the pony card to attach it to. Then the Ship's power is activated. Then the Pony's power is activated. Therefore, you would race-change one of the two cards in the original ship, and not the pony you swapped into the ship. <ins>This is not precisely true in the online version. When initially attached to the grid, changeling powers will activate prior to the ship, but otherwise this holds.</ins></div>"
		]
	},
	"gender-change": {
		"heading": "Gender Change",
		"questions": [
			"<div class='question'>OK, I think the card text makes this perfectly clear. But does a Gender Change or Race Change affect both ponies on a two-pony card?</div><div class='answer'>They do!</div>",
			"<div class='question'>A question on changelings! I know disguises only last for the player's turn, but what about if you ship something to a changeling on another turn and it doesn't have a disguise up? I'm assuming it still counts as itts race, but what about gender? They're unique in having no gender. And if I Rule 63 such a changeling, does it stay at 'no gender' or does it go all the way to the other end of the spectrum and become both male and female?</div><div class='answer'>It does not count as anything but a null card -- which is why their symbols are black! The only exception is that Chrysalis counts as a female. Introducing a Rule 63 card to a non-gendered changeling does not introduce a gender to them, alas!</div>",
			"<div class='question'>What happens when I play a Gender Change ship on a multi-gendered card, like the Wonderbolts? What about on a non-gendered card, like a changeling?</div><div class='answer'>A Gender Change ship has no effect on a multi-gendered Pony card, or on a Pony card with no gender.</div>",
			"<div class='question'>My friends and I are currently debating whether or not a genderswapped Prince Blueblood becomes a princess (for all princess related goals)? We noticed he doesn't have 'prince' as a keyword...</div><div class='answer'>Unfortunately, by RAW, no! Unless he is given the Princess keyword, he is not a Princess. However, if you want to house rule that it works that way, be my guest! We can definitely see the logic in that!</div>",
			"<div class='question'>I had Shining Armor shipped with Cider Season Applejack, and then used a ship card to change Applejack into a male. My friend and I agreed that that counted for the goal, but I'm a bit unconvinced in hindsight, what would you say?</div><div class='answer'>Good question! <del>I'd say, for sake of keeping things simple, that totally works. \"Lol, whoops, ACTUALLY I'M A DUDE\" is a totally valid play. But that is also a thing that I think can absolutely be answered group to group if that answer is unsatisfactory. Cutie Mark Crusader house rules, YAY!</del><ins>Nope, this doesn't count because the ship isn't broken</ins></div>",
			"<div class='question'>Is it possible to use a Gender Change ship to make a Pony card genderless?</div><div class='answer'>No. Gender Change ships refer to \"opposite gender\", so a male Pony card can only become a female Pony card, and vice versa.</div>",
			"<div class='question'>If a pony card has one of its attributes changed (e.g. gender, race, keyword) and then it's moved to another spot on the grid, does it keep that change? What if it's discarded?</div><div class='answer'>The card keeps that attribute change even if it's moved or discarded. So you can change Big Mac into a princess, discard him, pull him back into your hand, and then play him again with a normal ship, and he'll be just as fabulously princessy as before.</div>"
		]
	},
	"Core.Pony.TheWonderbolts": {
		"heading": "",
		"questions": [
			"<div class='question'>The Wonderbolts card says \"counts as a single pony\", and the Changeling card says \"becomes a copy of any single [pegasus symbol] of your choice\". Does this mean the changeling card can be used as a copy of the Wonderbolts?</div><div class='answer'>A changeling can become a member of the Wonderbolts, yep!</div>",
			"<div class='question'>Can you ship the Wonderbolts (Who can become any sex) and a Pegasi Changeling (Who gain the Characteristics of the Wonderbolts) and count that towards the Goals Budding Curiosity or Charity Auction?.</div><div class='answer'>Interesting question! <del>I'd say probably yes.</del><ins>Gender is implemented as a set in tsssf.net. Male cards are {\"male\"}, female cards are {\"female\"}, the wonderbolts is {\"male\",\"female\"} and (most) changelings are {}. We can thus define the opposite gender as the complimentary set which would imply {\"male\", \"female\"} and {} are opposites, however the FAQ states that gender swap cards do not apply to no gender/both gender cards. It does not say whether these cards have no opposite, or whether they are an opposite to themself. tsssf.net interprets this as those cards have no opposite, and as such, the Wonderbolts cannot be gender swapped nor be shipped with an opposite gendered self.</ins></div>",
			"<div class='question'>Changelings don't gain powers, but what if one mimics the Wonderbolts? Does that combined male/female gender symbol imply that it can be either gender anyway?</div><div class='answer'>A Changeling copying the Wonderbolts earns their symbol, so they have the same ability.</div>",
			"<div class='question'>What happens when I play a Gender Change ship on a multi-gendered card, like the Wonderbolts? What about on a non-gendered card, like a changeling?</div><div class='answer'>A Gender Change ship has no effect on a multi-gendered Pony card, or on a Pony card with no gender.</div>",
			"<div class='question'>Do The Wonderbolts count as both genders simultaneously or are they simply one or the other for any situation?</div><div class='answer'>Both simultaneously.</div>"
		]
	},
	"male-female": {
		"heading": "Multi-gendered Cards",
		"questions": [
			"<div class='question'>Can you ship the Wonderbolts (Who can become any sex) and a Pegasi Changeling (Who gain the Characteristics of the Wonderbolts) and count that towards the Goals Budding Curiosity or Charity Auction?.</div><div class='answer'>Interesting question! <del>I'd say probably yes.</del><ins>Gender is implemented as a set in tsssf.net. Male cards are {\"male\"}, female cards are {\"female\"}, the wonderbolts is {\"male\",\"female\"} and (most) changelings are {}. We can thus define the opposite gender as the complimentary set which would imply {\"male\", \"female\"} and {} are opposites, however the FAQ states that gender swap cards do not apply to no gender/both gender cards. It does not say whether these cards have no opposite, or whether they are an opposite to themself. tsssf.net interprets this as those cards have no opposite, and as such, the Wonderbolts cannot be gender swapped nor be shipped with an opposite gendered self.</ins></div>",
			"<div class='question'>Changelings don't gain powers, but what if one mimics the Wonderbolts? Does that combined male/female gender symbol imply that it can be either gender anyway?</div><div class='answer'>A Changeling copying the Wonderbolts earns their symbol, so they have the same ability.</div>",
			"<div class='question'>What happens when I play a Gender Change ship on a multi-gendered card, like the Wonderbolts? What about on a non-gendered card, like a changeling?</div><div class='answer'>A Gender Change ship has no effect on a multi-gendered Pony card, or on a Pony card with no gender.</div>",
			"<div class='question'>Do The Wonderbolts count as both genders simultaneously or are they simply one or the other for any situation?</div><div class='answer'>Both simultaneously.</div>"
		]
	},
	"Core.Goal.MyFirstSlash": {
		"heading": "",
		"questions": [
			"<div class='question'>My First Slash. Can it really be won if you use the unicorn changling to stand in for Shining Armor?</div><div class='answer'>Yes.</div>"
		]
	},
	"Core.Pony.QueenChrysalis": {
		"heading": "",
		"questions": [
			"<div class='question'>Changelings gain all of the symbols of the card they mimic. Does that mean that if Queen Chrysalis (who is already female) mimics Discord, she gains the male symbol and counts as both a male and a female simultaneously?</div><div class='answer'><del>This was not our original intention, but I believe you're correct! By default, symbols and keywords are not replaced when others are gained, so Chrysalis would become a Discord who is both male and female at the same time.</del><ins>When a changeling gains a symbol, it replaces its previous symbol. When a changeling gains a name/keyword, it gains them in additional to its original name/keywords.</ins></div>"
		]
	},
	"swap": {
		"heading": "Swap Power",
		"questions": [
			"<div class='question'>I play a Changeling copying a pony on the grid, then use a Swap power to swap the 'ling with the original. Does this count as breaking up the ship?</div><div class='answer'>Yep! It's still a different Pony, even if it's the same ... pony.</div>",
			"<div class='question'>Say you break up Pony A and Pony B by swapping Pony A to a different ship. Then you use another swap power to put Pony A back together with Pony B. Does the first break up still count?</div><div class='answer'>Yes! As long as it's broken up at some point, it counts!</div>",
			"<div class='question'>When a card's power says you can swap two cards, does that mean two cards anywhere on the grid? Or can you only swap two adjacent cards?</div><div class='answer'>Anywhere on the grid.</div>",
			"<div class='question'>In playing we had a moment of confusion over the swap two ponies ability. We wondered if it meant (and I hope I can type this without being to confusing) that you would pick up a pony and change it with another and that counted as swap two ponies. Or if you got to move two different ponies with two other ponies on the board and that counted as swap two ponies.</div><div class='answer'>By picking up two ponies and switching their places, you're swapping two ponies!</div>",
			"<div class='question'>When a Goal card asks to make 3 ships from your hand in one turn, does playing a Ship card to connect two ponies already on the field count towards that goal?</div><div class='answer'>You've managed to play a ship \"from your hand\" when you use a Ship and/or Pony card from your hand to make it. Replace powers, connecting two ponies already on the grid, love poisons, etc all count as \"from your hand\". However, Swapping ponies around does not.</div>",
			"<div class='question'>I'm a little confused as to the order in which Ship and Pony cards activate. I had a situation where I wanted to use a race-changing ship card and attach a new pony with a swap power, and the order of operations mattered.</div><div class='answer'>The order of operations is thus: you play the ship card, then the pony card to attach it to. Then the Ship's power is activated. Then the Pony's power is activated. Therefore, you would race-change one of the two cards in the original ship, and not the pony you swapped into the ship. <ins>This is not precisely true in the online version. When initially attached to the grid, changeling powers will activate prior to the ship, but otherwise this holds.</ins></div>"
		]
	},
	"breaking-ships": {
		"heading": "Breaking Ships",
		"questions": [
			"<div class='question'>I play a Changeling copying a pony on the grid, then use a Swap power to swap the 'ling with the original. Does this count as breaking up the ship?</div><div class='answer'>Yep! It's still a different Pony, even if it's the same ... pony.</div>",
			"<div class='question'>I had Shining Armor shipped with Cider Season Applejack, and then used a ship card to change Applejack into a male. My friend and I agreed that that counted for the goal, but I'm a bit unconvinced in hindsight, what would you say?</div><div class='answer'>Good question! <del>I'd say, for sake of keeping things simple, that totally works. \"Lol, whoops, ACTUALLY I'M A DUDE\" is a totally valid play. But that is also a thing that I think can absolutely be answered group to group if that answer is unsatisfactory. Cutie Mark Crusader house rules, YAY!</del><ins>Nope, this doesn't count because the ship isn't broken</ins></div>",
			"<div class='question'>Let's say that one of the active goals is \"It's not Evil\" (break Shining Armor up from any female except Twilight). Let's also say that he is currently shipped with 4 females (none of whom are Twilight) would playing something like Broken Wing Rainbow Dash (female, replace) on any of the 4 ships count to win the goal?</div><div class='answer'>Yep! Replacing counts as breaking up a ship!</div>"
		]
	},
	"Core.Pony.Derpy": {
		"heading": "",
		"questions": [
			"<div class='question'>How does the Derpy Hooves card work?</div><div class='answer'>Derpy Hooves is played like any other Pony card. When she is attached to the grid via a ship card is when her power triggers, and you must swap Fan Fiction Author Twilight with any other Pony card. Derpy can be discarded, swapped, and pulled from the discard pile like any other Pony card, and her power can be activated after she's already on the grid like any other power.</div>"
		]
	},
	"Core.Pony.Discord": {
		"heading": "",
		"questions": [
			"<div class='question'>Hi, I was wondering how the pony card Discord works. Can I select 1 pony card and move it to break a chain? Or do I have to do a proper swap (ie. move 2 pony cards)?</div><div class='answer'>For Discord's power, choose either 2 or 3 ponies on the grid. Discord can be one of the ponies you choose. Pick them up. Then put them back in any order. No card can be in the same place it was before you picked them up.</div>"
		]
	},
	"Core.Pony.FreedomFighterPinkiePie": {
		"heading": "",
		"questions": [
			"<div class='question'>Does playing a card you got from Freedom Fighter Pinkie's power count as a play from hand for the purposes of goals?</div><div class='answer'>It does!</div>",
			"<div class='question'>Does playing a card you got from Freedom Fighter Pinkie's power count as a play from hand for the purposes of goals?</div><div class='answer'>It does!</div>"
		]
	},
	"play-pony": {
		"heading": "Playing Ponies",
		"questions": [
			"<div class='question'>Does playing a card you got from Freedom Fighter Pinkie's power count as a play from hand for the purposes of goals?</div><div class='answer'>It does!</div>",
			"<div class='question'>Does playing a card you got from a Search the Discard Pile power count as a play from hand for the purposes of goals?</div><div class='answer'>It does!</div>",
			"<div class='question'>I played an alicorn Pony card from my hand, destroyed the grid, pulled the alicorn back into my hand, and played it again. Does that count as playing two alicorns from my hand on my turn?</div><div class='answer'>Yes. This follows the spirit of the goal, in that you had to do some serious work to get that \"second\" alicorn out, so it's fair to allow it.</div>",
			"<div class='question'>I played a unicorn from my hand, and then later turned it into an alicorn. Does that count as playing an alicorn from my hand?</div><div class='answer'>Yes. At that moment, the card satisfies the two conditions of \"alicorn\" and \"played from the hand\".</div>",
			"<div class='question'>The 'play 3 of RACE' all specify playing from your hand. What counts as playing from your hand? Like, I put down a pegasus with 'Time For an Experiment!' to change its race to unicorn to count for a goal. Does that count?</div><div class='answer'>That counts!</div>",
			"<div class='question'>And what if I just slide said ship card in between two adjacent non-shipped pony cards to change one of them into a unicorn? Or any ship card between two non-shipped unicorns on the grid? Does it just mean I have to introduce a unicorn into the shipping grid?</div><div class='answer'>Sliding a ship between two ponies does not count as playing either pony because the goal specifically instructs to play a Pony from your hand, not a Ship!</div>",
			"<div class='question'>I'm a little confused as to the order in which Ship and Pony cards activate. I had a situation where I wanted to use a race-changing ship card and attach a new pony with a swap power, and the order of operations mattered.</div><div class='answer'>The order of operations is thus: you play the ship card, then the pony card to attach it to. Then the Ship's power is activated. Then the Pony's power is activated. Therefore, you would race-change one of the two cards in the original ship, and not the pony you swapped into the ship. <ins>This is not precisely true in the online version. When initially attached to the grid, changeling powers will activate prior to the ship, but otherwise this holds.</ins></div>"
		]
	},
	"play-ship": {
		"heading": "Playing Ships",
		"questions": [
			"<div class='question'>Does playing a card you got from Freedom Fighter Pinkie's power count as a play from hand for the purposes of goals?</div><div class='answer'>It does!</div>",
			"<div class='question'>Goal: Needs more lesbians. Does shipping a female from your hand to another female on the grid, sliding a ship card between the played female and one below that is on the grid, then playing another female shipped to the first female played fulfill this goal?</div><div class='answer'>Yep! As long as you play the cards from your hand, it counts. Keep in mind, however, that if it's a different Goal that requires you to play 3 &lt;Type of pony&gt; cards from your hand, playing a Ship card from your hand does not fulfill that requirement.</div>",
			"<div class='question'>Needs More Lesbians: Can this be won by playing a female card with the replace power, into a space that has three females shipped to it?</div><div class='answer'>Yep!</div>",
			"<div class='question'>When a Goal card asks to make 3 ships from your hand in one turn, does playing a Ship card to connect two ponies already on the field count towards that goal?</div><div class='answer'>You've managed to play a ship \"from your hand\" when you use a Ship and/or Pony card from your hand to make it. Replace powers, connecting two ponies already on the grid, love poisons, etc all count as \"from your hand\". However, Swapping ponies around does not.</div>",
			"<div class='question'>Slipping a Ship between two Stallions already on the board counts as \"playing a ship\" for Quite., correct?</div><div class='answer'>Correct! As long as you play a card from your hand to complete a ship, it counts as being \"From your hand.\"</div>"
		]
	},
	"Core.Pony.GypsyWitchPinkiePie": {
		"heading": "",
		"questions": [
			"<div class='question'>Gypsy Witch Pinkie Pie. After you draw your cards, must you immediately discard. Or can you play those cards in your hand and discard at the end?</div><div class='answer'>You must immediately discard. But you can discard from your entire hand, and not just the ones you drew!</div>",
			"<div class='question'>Gypsy Witch Pinkie Pie is broken! I played a game where a player was able to move her around the board, and nearly emptied the pony deck in one turn!</div><div class='answer'>When constructing TSSSF, we've tried to leave the rules as simple as possible, and put as few restrictions on play, to give players a freedom to lose themselves in the game without worrying too much about mechanics, while at the same time letting them get those long chains of combos if that's what they enjoy. However, we've still been getting a number of complaints, especially about how easy it is to abuse pony powers. If you don't like how a particular mechanic plays, we highly encourage houseruling it to what feels right. To limit the effectiveness of pony powers, we recommend the houserule: \"A Pony card's power can only ever be activated once per turn.\"</div>"
		]
	},
	"Core.Pony.Pinkamena": {
		"heading": "",
		"questions": [
			"<div class='question'>I'm confused as to what exactly Pinkamena's card power does. It sounds a lot like replace, but it repeats the phrase \"if you do, discard another pony card.\"</div><div class='answer'>Yep! Pinkamena is special. She replaces a card on the grid—and then you choose another pony to discard as well. She takes someone down with her, in effect, so you're discarding both the pony she replaces and another pony of your choice for a total of two cards.</div>"
		]
	},
	"Core.Goal.CargoShip": {
		"heading": "",
		"questions": [
			"<div class='question'>Not sure if it was asked already but for the goal card \"Cargo Ship\" the wording is \"Ship 2 ponies with the \"Object\" keyword\". I took this as ship two of the TOGETHER, but a friend took it as just ship an object keyword with any two ponies. What was the intended ruling?</div><div class='answer'>It's ship 2 ponies with the Object keyword together as you surmised, yep!</div>"
		]
	},
	"Core.Goal.CommanderHurricansArmy": {
		"heading": "",
		"questions": [
			"<div class='question'>Alicorns count as pegasus correct? So three of them would count for the goal of \"Commander Hurricane's Army\"?</div><div class='answer'>Alas, the only time alicorns and pegasi count for the same Goal is for Pomf!, which is *specifically* referring to things with wings. It does not count for Commander Hurricane's Army, which is specifically only referring to Pegasi.</div>"
		]
	},
	"Core.Goal.FriendshipIsBenefits": {
		"heading": "",
		"questions": [
			"<div class='question'>For this Goal, can more than six cards be used, so long as they are all versions of the Mane 6 (and of course, there's at least one of each involved)?</div><div class='answer'>More than six cards can be used so long as they're all part of the Mane 6!</div>"
		]
	},
	"replace": {
		"heading": "Replace Power",
		"questions": [
			"<div class='question'>Do Replace effects count as position changes for the purposes of I Need to Make A Flowchart?</div><div class='answer'>\"Hold On; I Need To Make a Flow Chart\" specifically references swapping ponies, so by the text Replace powers wouldn't work. However, in terms of game balance, I don't see why Replace powers couldn't work as well. You'd need twice as many to get the same effect, and they follows the spirit of the Goal.If you like, feel free to houserule that that Goal says \"You Swap or Replace 6 Pony card positions in one turn.\"</div>",
			"<div class='question'>Let's say that one of the active goals is \"It's not Evil\" (break Shining Armor up from any female except Twilight). Let's also say that he is currently shipped with 4 females (none of whom are Twilight) would playing something like Broken Wing Rainbow Dash (female, replace) on any of the 4 ships count to win the goal?</div><div class='answer'>Yep! Replacing counts as breaking up a ship!</div>",
			"<div class='question'>Can a Copy pony copy a Replace ability?</div><div class='answer'>The replace power explicitly says \"this power cannot be copied.\" so nope!</div>",
			"<div class='question'>When a goal says something like... Win this when you play 3 lesbian ships from your hand, does using a replace power to form a lesbian ship count? What if it replaces a pony that already had multiple female ponies shipped to it -- do those count as forming new lesbian ships?</div><div class='answer'>As per the definition of \"play\" in the rules, replace powers definitely count as playing from your hand! And any ships previously attached to the old card are now attached to the new one, so yes! It counts!</div>",
			"<div class='question'>When I use the Replace power, do any other cards' powers activate?</div><div class='answer'>No. The only card in this situation which would be considered activated is the one with the Replace power. And because that card says \"While in your hand,\" it won't do any good once it's on the grid.</div>",
			"<div class='question'>When a Goal card asks to make 3 ships from your hand in one turn, does playing a Ship card to connect two ponies already on the field count towards that goal?</div><div class='answer'>You've managed to play a ship \"from your hand\" when you use a Ship and/or Pony card from your hand to make it. Replace powers, connecting two ponies already on the grid, love poisons, etc all count as \"from your hand\". However, Swapping ponies around does not.</div>"
		]
	},
	"Core.Goal.HoldOnINeedToMakeAFlowChart": {
		"heading": "",
		"questions": [
			"<div class='question'>Do Replace effects count as position changes for the purposes of I Need to Make A Flowchart?</div><div class='answer'>\"Hold On; I Need To Make a Flow Chart\" specifically references swapping ponies, so by the text Replace powers wouldn't work. However, in terms of game balance, I don't see why Replace powers couldn't work as well. You'd need twice as many to get the same effect, and they follows the spirit of the Goal.If you like, feel free to houserule that that Goal says \"You Swap or Replace 6 Pony card positions in one turn.\"</div>"
		]
	},
	"Core.Goal.InvasiveSpecies": {
		"heading": "",
		"questions": [
			"<div class='question'>With invasive species, does it mean you only need to have six earth ponies on the board, or do they need to all be connected?</div><div class='answer'>There need to be 6 pairs of earth ponies shipped together on the board! They don't all have to be shipped in one giant line, but there need to be 6 separate ships on which two earth ponies are attached. (For a total of 12 earth ponies.)</div>",
			"<div class='question'>Would shipping one earth pony with four others count? Would you count the center pony once or once for each pony its shipped with?</div><div class='answer'>That would count! It would count for each earth pony ship the center pony is attached to! However, you'd need two more ships to actually complete the Goal, as that is only a total of 4 Ships.</div>"
		]
	},
	"Core.Goal.ItsNotEvil": {
		"heading": "",
		"questions": [
			"<div class='question'>I had Shining Armor shipped with Cider Season Applejack, and then used a ship card to change Applejack into a male. My friend and I agreed that that counted for the goal, but I'm a bit unconvinced in hindsight, what would you say?</div><div class='answer'>Good question! <del>I'd say, for sake of keeping things simple, that totally works. \"Lol, whoops, ACTUALLY I'M A DUDE\" is a totally valid play. But that is also a thing that I think can absolutely be answered group to group if that answer is unsatisfactory. Cutie Mark Crusader house rules, YAY!</del><ins>Nope, this doesn't count because the ship isn't broken</ins></div>",
			"<div class='question'>Let's say that one of the active goals is \"It's not Evil\" (break Shining Armor up from any female except Twilight). Let's also say that he is currently shipped with 4 females (none of whom are Twilight) would playing something like Broken Wing Rainbow Dash (female, replace) on any of the 4 ships count to win the goal?</div><div class='answer'>Yep! Replacing counts as breaking up a ship!</div>"
		]
	},
	"Core.Goal.ItsNotExactlyCheating": {
		"heading": "",
		"questions": [
			"<div class='question'>If a pony, say, Cheerilee, is shipped with, say, Discord, and also shipped with Queen Chrysalis who is disguised as Discord, is that eligible for the pony-with-two-versions-of-another-pony goal or no since to Cheerilee it would just seem like two of the same version of Discord?</div><div class='answer'>Yep! For the sake of ease and keeping things simple in the long run, a disguised changeling counts as a \"different version\" of another pony.</div>",
			"<div class='question'>For the \"Technically It's Not Cheating\" goal, does the \"two different versions of another pony\" mean something like Fanfic Author Twilight + Star Student Twilight, or do they have to be different in some way, such as one has to be of a different race/gender, like a male Applejack and a female Applejack?</div><div class='answer'>Good question! It's only the first version you need to worry about, so, say Cider Season Applejack shipped with both Fanfic Author Twilight and Star Student Twilight would fulfill this goal.</div>"
		]
	},
	"Core.Goal.NeedsMoreLesbians": {
		"heading": "",
		"questions": [
			"<div class='question'>Goal: Needs more lesbians. Does shipping a female from your hand to another female on the grid, sliding a ship card between the played female and one below that is on the grid, then playing another female shipped to the first female played fulfill this goal?</div><div class='answer'>Yep! As long as you play the cards from your hand, it counts. Keep in mind, however, that if it's a different Goal that requires you to play 3 &lt;Type of pony&gt; cards from your hand, playing a Ship card from your hand does not fulfill that requirement.</div>",
			"<div class='question'>Needs More Lesbians: Can this be won by playing a female card with the replace power, into a space that has three females shipped to it?</div><div class='answer'>Yep!</div>"
		]
	},
	"Core.Goal.PrincessPile": {
		"heading": "",
		"questions": [
			"<div class='question'>Regarding the Princess Pile goal, is e.g. two Celestias shipped with a Luna correct, or do I need one of each princess?</div><div class='answer'>Any princesses, even duplicates, will work.</div>",
			"<div class='question'>Since Race-change ships affect both ponies on a two-pony card, does that mean shipping Nightmare Moon with pricessified Aloe & Lotus fulfills Princess Pile?</div><div class='answer'>Indeedy!</div>"
		]
	},
	"Core.Goal.Swinging": {
		"heading": "",
		"questions": [
			"<div class='question'>To complete Swinging (pair one pony with Mr. and Mrs. Cake), would it work to, for example, pair Mr. Cake with Lyra, then pair Mrs. Cake with a Changeling disguised as Lyra?</div><div class='answer'>Nope! Has to be the same Pony card, so they'd both have to pair off with the same Lyra card.</div>"
		]
	},
	"love-poison": {
		"heading": "Love Poisons",
		"questions": [
			"<div class='question'>Does \"immune to love poison\" only mean those ponies can't be moved from their position with love poison, or does it also mean you can't move another pony to be shipped with them with love poison?</div><div class='answer'>They can't be moved from the grid via love poison card.</div>"
		]
	},
	"HorriblePeople.2014ConExclusives.Pony.TestSubjectCheerilee": {
		"heading": "",
		"questions": [
			"<div class='question'>Random Question. How does the copy ability work with a Special Ability like \"Test Subject Cheerilee\"? If you copy her ability, does the power only last until the end of the turn, or permanently?</div><div class='answer'>For the special promo cards, we've taken care to make sure the power says the name of the card instead of \"this Pony.\" That means, if it does get copied, it would just basically make Test Subject Cheerilee do what she always does.For example, if Trixie copied her power, Trixie's new power would be:When Cheerilee is shipped with four Pony cards, discard her from the grid. Turn over a Temporary Goal. Temporary Goals are not replaced with a new Goal when they are won.... That said, it seems we've forgotten to specify Test Subject Cheerilee. Rules As Written, I suppose that means it could affect any other Cheerilee card; Rules as Intended, it's only supposed to affect Test Subject Cheerilee.Take that as you will.</div>",
			"<div class='question'>What is a Temporary Goal?</div><div class='answer'>Temporary Goals are a mechanic introduced by some of our non-core cards, such as the BronyCAN 2014 Convention Exclusive, Test Subject Cheerilee. Temporary Goals are goals that are added to the board after specific circumstances on the card are met. A Temporary Goal:<ul><li>...does not count toward the number of Goals in play.</li><li>...is not replenished when it is won.</li><li>...can be replaced with any appropriate pony power that would get a new Goal, including New Goal powers and cards such as Mahou Shoujo Derpy. That new Goal is still a Temporary Goal.</li></div>"
		]
	},
	"HorriblePeople.2014ConExclusives.Pony.LunaQueenOfTheBats": {
		"heading": "",
		"questions": [
			"<div class='question'>During a play using Luna, Queen of that bats a question came up. What would happen in the slim chance that she is played in the middle of a 4 way ship and her effect cant be completed?</div><div class='answer'>In that case, you would play a ship from the Ship card deck between Luna and any adjacent pony. If you're playing with the Advanced rules, you could then choose to set off that other pony's power, since it was shipped with an adjacent pony.</div>"
		]
	},
	"pony-action": {
		"heading": "Pony Powers",
		"questions": [
			"<div class='question'>Do pony card abilities always activate when played? The way my friend and I played, we were only forced to activate the ability if the word \"must\" was used in the instructions for the ability. If the ability used the word \"may\" we figured we had a choice of activation. Is this the case or were we playing it wrong?</div><div class='answer'>You are correct! \"May\" means you don't have to activate it; \"must\" means you do.</div>",
			"<div class='question'>I'm confused. When do Pony card powers trigger?</div><div class='answer'>There are generally three situations where Pony card powers will trigger:<ol><li>When a Pony card is attached to the shipping grid with a Ship card. The new pony's power activates.</li><li>When a Ship card is played between two Pony cards on the shipping grid. The player who played the ship picks one Pony card. That card's power activates.</li><li>If a power starts with the text \"While in your hand,\" or the card text indicates it needs to be in your hand (see Cheerilee), then the pony's power can be activated at any point on your turn while it's in your hand.</li></ol>Note that some cards don't have powers that trigger when played, like the Wonderbolts.</div>"
		]
	},
	"copy": {
		"heading": "Copy Power",
		"questions": [
			"<div class='question'>When can I use the Copy power?</div><div class='answer'>Ponies with Copy powers need to be on the shipping grid to activate. So, like with any other pony power, it goes off as you attach it on the grid.</div>",
			"<div class='question'>Can a Copy pony copy a Replace ability?</div><div class='answer'>The replace power explicitly says \"this power cannot be copied.\" so nope!</div>"
		]
	},
	"goals": {
		"heading": "Goals",
		"questions": [
			"<div class='question'>If I draw a new Goal that deals with circumstances on the board (such as Pomf! requiring a certain number of Pegasi and/or Alicorn pairs on the board), and there's already that many in play, would it be won? Or would it have to be accomplished with new ships?</div><div class='answer'>Any time a goal is drawn that is already completed, it is immediately put on the bottom of the goals deck and a new one is drawn.</div>",
			"<div class='question'>I have a quick rule question about goal cards. If the player loses the qualifying conditions do they have to discard it or just once they meet it they keep it?</div><div class='answer'>You definitely keep it! In fact a lot of great plays involve creating the conditions for a goal, then immediately destroying everything to win another one.</div>"
		]
	},
	"search": {
		"heading": "Search Power",
		"questions": [
			"<div class='question'>Do you have to show a card that you searched for in a deck?</div><div class='answer'>No, it is not necessary to reveal the card you pulled out of deck before putting it into your hand.</div>",
			"<div class='question'>Does playing a card you got from a Search the Discard Pile power count as a play from hand for the purposes of goals?</div><div class='answer'>It does!</div>",
			"<div class='question'>Are you allowed to look through the discard pile without playing a card like Starswirl? Also, is the discard pile face up? Do Players have a right to look at cards when they are discarded?</div><div class='answer'>You can always flip through the discard pile, and yes it's face up.</div>"
		]
	},
	"clone": {
		"heading": "Clone Power",
		"questions": [
			"<div class='question'>It says the player \"may choose one Pony card attached to this Ship. Until the end of your turn, that Pony card counts as two ponies.\" Well, can we choose Aloe & Lotus and make that card four ponies?</div><div class='answer'>Any Pony CARD you choose will count as two Ponies. Since Aloe & Lotus is a single Pony card, it will simply continue to be two Ponies.</div>",
			"<div class='question'>If you have a goal that is satisfied when two of the same ponies are shipped together, can you satisfy that goal by cloning the goal pony and shipping it to another unrelated pony? (Ex. Rodeo. (Two AJs Shipped Together) I have Sharpshooter Applejack and Major General Rainbow Dash on the board. Could I claim Rodeo if I used a Clone Ship between those two and used its power to clone AJ?)</div><div class='answer'>Nope! Those two cloned ponies are not shipped together; they are merely two ponies on the same card. To ship two ponies together they HAVE to be connected by a Ship card.</div>"
		]
	},
	"keyword-change": {
		"heading": "Keyword Change",
		"questions": [
			"<div class='question'>If a pony card has one of its attributes changed (e.g. gender, race, keyword) and then it's moved to another spot on the grid, does it keep that change? What if it's discarded?</div><div class='answer'>The card keeps that attribute change even if it's moved or discarded. So you can change Big Mac into a princess, discard him, pull him back into your hand, and then play him again with a normal ship, and he'll be just as fabulously princessy as before.</div>"
		]
	},
	"play-from-discard": {
		"heading": "Playing from Discard",
		"questions": [
			"<div class='question'>When you use a ship card to play from the top of the discard, do the cards being played have their powers activate as well for being played? Provided the effects don't say \"from the hand\" or something to that effect.</div><div class='answer'>Yep! It will activate their powers.</div>",
			"<div class='question'>Does playing a card from the discard pile count as a play from hand for the purposes of goals?</div><div class='answer'>That's a good question! It does not, because it doesn't come from your hand!</div>"
		]
	},
	"chain": {
		"heading": "Chains",
		"questions": [
			"<div class='question'>Are chains allowed to have branches?</div><div class='answer'>For chains, the path only needs to be a single unbroken line. Branches are fine!</div>"
		]
	},
	"disconnected-cards": {
		"heading": "Disconnected Cards",
		"questions": [
			"<div class='question'>When cards get disconnected, are there any suggested rules for what order they go on the discard pile? Sometimes people would like to cause something to get discarded in order to use a \"play from discard\" power and activate the other card's power. Can people put things on the discard in any order they want?</div><div class='answer'>My first instinct is that the current player gets to discard the cards in whatever order they want. It's a clever combo, and one I wouldn't want to penalize.That said, if you're not a fan of this answer, I'd recommend adding a houserule where you have to shuffle the discard pile any time multiple cards go into the discard pile as the result of a single effect.</div>",
			"<div class='question'>When you have to discard a card without replacing it (wild fire's passive for example) do the ship cards attached to it get discarded as well? Or do they stay open for another pony to swoop in and steal their hearts?</div><div class='answer'>If a Ship card ever doesn't have two Ponies connected to it, it must be discarded.</div>"
		]
	},
	"HorriblePeople.2014ConExclusives.Pony.BlazinHotWildFire": {
		"heading": "",
		"questions": [
			"<div class='question'>When you have to discard a card without replacing it (wild fire's passive for example) do the ship cards attached to it get discarded as well? Or do they stay open for another pony to swoop in and steal their hearts?</div><div class='answer'>If a Ship card ever doesn't have two Ponies connected to it, it must be discarded.</div>"
		]
	},
	"alt-timeline": {
		"heading": "Alt Timeline/Time Traveler",
		"questions": [
			"<div class='question'>What does the red hourglass symbol mean? Do they do anything special?</div><div class='answer'>Thematically, the hour glass refers to ponies from Twilight's hundred-plus-chapter epic \"Of Ponies and Peril\". Some goal cards refer to them, such as Time Travelers Among Us. It's pretty much just another form of keyword! We usually refer to them as \"dystopian future ponies,\" but you can choose whatever term you like for them.</div>"
		]
	},
	"alicorn": {
		"heading": "Alicorns",
		"questions": [
			"<div class='question'>Do alicorns always count as Princesses?</div><div class='answer'>No. The only ponies who count as princesses are those with the Princess keyword.</div>"
		]
	},
	"princess": {
		"heading": "Princess Keyword",
		"questions": [
			"<div class='question'>Do alicorns always count as Princesses?</div><div class='answer'>No. The only ponies who count as princesses are those with the Princess keyword.</div>"
		]
	},
	"turn-order": {
		"heading": "Turn Order",
		"questions": [
			"<div class='question'>What order do players play in?</div><div class='answer'><del>We'll leave that up to your players to decide, but we go by the standard: Play starts with the player to the left of the dealer, and proceeds to the left. If a player won the last game, they get to choose who goes first.</del><ins>The websites assigns a random order automatically.</ins></div>"
		]
	},
	"new-goal": {
		"heading": "New Goal Power",
		"questions": [
			"<div class='question'>If you are in the middle of a turn and a goal is switched in (via Zecora or another card like that) and that goal says something like play three unicorn ships from your hand this turn. Does the goal go into effect when it it revealed or does it take into account the whole turn?</div><div class='answer'>The goals that deal with \"on your turn\" take into account your whole turn when they're played - although just like any other goal, if it is completed when it's drawn, it goes to the bottom of the goal pile and a new one is drawn. It's not fair to sweep Goals accidentally - you have to work for it! :)</div>"
		]
	}
} as {[k:string]: {heading: string, questions: string[]}}