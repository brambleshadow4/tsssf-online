var HEAD = `
	<link href="/game/game.css" type="text/css" rel="stylesheet" />
	<title>In Game</title>
	<meta property="og:title" content="Game in Progress">
	<meta property="og:description" content="Play and host TSSSF games through the magic of the internet">
	<meta property="og:image" content="http://tsssf.net/img/tsssf-box.png">
`

var HTML = `
<div>
	<div id='sidebar'>
		<div id='ponyDrawPile' class='card pony'></div>
		<div class='shuffleContainer'>
			<img id='ponyShuffle' class='shuffle' src="/img/shuffle.svg"/>
		</div>
		<div id='ponyDiscardPile' class='card discard'></div>
		<div id="shipDrawPile" class='card ship'></div>
		<div class='shuffleContainer'>
			<img id='shipShuffle' class='shuffle' src="/img/shuffle.svg"/>
		</div>
		<div id="shipDiscardPile" class='card discard'></div>
		<div id="goalDrawPile" class='card goal'></div>
		<div class='shuffleContainer'>
			<img id='goalShuffle' class='shuffle' src="/img/shuffle.svg"/>
		</div>
		<div id="goalDiscardPile" class='card discard'></div>
		<div id='turnInfo'></div>
	</div>
	<div id='playingArea'>
		<div id='topToolbar'>
			<div id='playerList'></div>
			<div id='actionButtons'>
				<img  onclick="moveToStartCard()" src="/img/home.svg"/>
				<img id='helpButton' onclick="createHelpPopup()" src="/img/help.svg"/>
			</div>
		</div>
		<div id='winnings'></div>
	</div>
</div>
<div id='cardRow'>
	<div id='currentGoals'>
		<div class='card goal'></div>
		<div class='card goal'></div>
		<div class='card goal'></div>
	</div>
	<div class='divider'></div>
	<div id='hand'>
		<div id='hand-pony'>
			<div class='card pony'></div>
			<div class='card pony'></div>
			<div class='card pony'></div>
			<div class='card pony'></div>
		</div>
		<div id='hand-ship'>
		
			<div class='card ship'></div>
			<div class='card ship'></div>
			<div class='card ship'></div>
		</div>
	</div>
</div>
<div id='preloadedImages' style="display: none;"></div>


<div id='help'>
	<div tab-name="Quick Start">
		<div class='popupPage tiles'>
			<!-- the gifs are size 1923x1068 fyi. -->
			<div>
				<p>Draw pony, ship, and goal cards by clicking the decks on the left</p>
				<img class='helpGif' src="/img/help/drawCards.gif" />
			</div>

			<div>
				<p>Hold <span class='key'>Shift</span> and hover over a card to see the card in much more detail.</p>
				<img class='helpGif' src="/img/help/shiftHover.gif" />
			</div>

			<div>
				<p>Move cards onto the grid by dragging and dropping them from your hand.</p>
				<img class='helpGif' src="/img/help/dragCards.gif" />
			</div>

			<div>
				<p>Discard cards by holding down <span class='key'>D</span> and clicking them.</p>
				<img class='helpGif' src="/img/help/discard.gif" />
			</div>

			<div>
				<p>Swap cards around the grid by dragging and dropping them onto other cards.</p>
				<img class='helpGif' src="/img/help/swapCards.gif" />
			</div>

		</div>
	</div>
	<div tab-name="Quick Rules">
		<div class='popupPage'>
			<h1>Objective</h1>

			While playing this game you will construct a labyrinth flowchart of relationships between Twilight and everypony else, competing to bend those relationships in the shape of Twilight's goals for the fanfic.

			For each goal, you'll earn a number of points determined by the difficulty of that Goal card.

			<h2>Winning Score</h2>
			<table>
				<tr>
					<td>2-3 Players</td>
					<td>11 points</td>
				</tr>
				<tr>
					<td>4 players</td>
					<td>9 points</td>
				</tr>
				<tr>
					<td>5+ players</td>
					<td>7 points</td>
				</tr>
			</table>

			<h1>Setup</h1>

			<ul>
				<li>Place the Start Card ("Fanfic Author Twilight") in the center of the table</li>
				<li>Separate and shuffle the three decks; Ships, Goals, and Ponies</li>
				<li>Turn 3 Goal cards face-up on the table.</li>
				<li>Deal to each player a hand of 4 pony cards & 3 Ship cards. You can look, but don't show!</li>
			</ul>

			<h1>On Your Turn</h1>

			<p>Play begins with the player to the left of the dealer. Each turn proceeds as follows:</p>

			<ol>
				<li>Play at least one card from your hand</li>
				<li>At the end of your turn, draw up to or discard down to your hand limit (usually 7) in any combination of Ships and Ponies. You must finish drawing before looking at them. If you won any Goals, turn over new ones</li>
			</ol>

			<h1>Shipping Ponies, Powers, etc.</h1>
			<p>To ship Ponies, slide a Ship card halfway beneath a Pony card already on the grid and place a Pony card on top of the exposed half. Leave enough space between the Ponies to show there's a ship card beneath. A Pony can have 4 Ships attached to it: above, below, left, and right</p>

			<p>A Pony's power activates immediately after it is added to the grid from the player's hand. The exception is any card that says "while this card is still in your hand". A Pony's power can affect itself unless otherwise stated on the card. 

			</p><p>Two Pony cards that are adjacent but not connected by a Ship card are not considered shipped. Sliding a Ship card between them is a valid play.</p>

			<p>If any card is no longer connected to the grid it must be discarded. Ship cards without two Ponies attached must be discarded</p>

			<h1>Completing a Goal</h1>

			<p>If a Goal card's conditions are already met when it's drawn, then that goal card goes to the bottom of the Goal deck and a new one is drawn to replace it</p>

			<p>Otherwise, the instant a Goal's conditions are met, the Goal is achieved. This can be before a Pony's power activates or after, but not during. When a Goal is achieved, the current player acquires the Goal by putting it on the table in front of them, face up</p>

			<p>A Pony card counts toward achieving a Goal if the card's name, symbols, and/or keywords match that requirements for the Goal.</p>

			<h1>The Start Card</h1>

			<p>The Start card cannot be swapped, removed, moved, or otherwise budged from its starting position. Any cards that specify the Start card in their text are exceptions to this rule, like Derpy Hooves.</p>

			<h1>If a Deck Runs Out:</h1>

			<p>Simply shuffle the respective discard pile into the deck. If there is no discard pile to shuffle however...</p>

			<h1>Tearing Up Twilight's Notes</h1>

			<p>If you need to draw a card but there is neither deck nor discard pile, Twilight Sparkle has run out of ideas. She becomes frustrated with her notes, and in a fit of anger, destroys some of her work. </p>

			<ol>
				<li>The current player selects one Ship card on the grid and discards it</li>
				<li>Discard any Ship or Pony cards no longer connected to the shipping grid.</li>
				<li>Shuffle the newly created discard pile(s) to create a new deck, if that deck was empty</li>
				<li>The current player then draws from the new deck. If it runs out before they draw all their needed cards, rinse and repeat!</li>
			</ol>

			<h1>Something Was Confusing!</h1>
			<p>Never fear! First be sure to check the full rules. If you are still unsure about the rules in a certain situation, discuss it amongs your fellow players and come up with a house rule. Then, please send us some feedback about whatever it was that confused you. We're always happy to find more ways to make TSSSF easy &amp; fun!</p>

			<p>Catch Up on Our Site!</p>

			<p>For answers to rules questions and updates on future editions of Twilight Sparkle's Secret Shipfic Folder, check out our website <a href="http://www.secretshipfic.com">http://www.secretshipfic.com</a></p>

			<h1>Get Exclusive Previews!</h1>

			<p>Like TSSSF? Want more TSSSF faster?? Have we got a deal for you! Support us through Patreon and get art previews, private livestreams, playtest diaries and more! Check it out at <a href="http://www.patreon.com/horriblepeople">http://www.patreon.com/horriblepeople</a></p>
		</div>
	</div>
	<div tab-name="Full Rules">
		<iframe src="/rulebook.html"></iframe>
	</div>
	<div tab-name="Card Reference"></div>
</div>

<script src="/game/gamePublic.js"></script>
<script type="module" src="/game/game.js"></script>
<script type="module" src="/game/network.js"></script>
`
export { HTML, HEAD }