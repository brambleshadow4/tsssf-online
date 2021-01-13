var HEAD = `
	<link href="/lobby.css" type="text/css" rel="stylesheet" />

	<title>Lobby: Twilight Sparkle's Secret Shipfic Folder Online</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0">

	<meta name="twitter:card" content="summary" />
	<meta property="og:title" content="Join TSSSF Game">
	<meta property="og:description" content="You've been invited to play a game of Twilight Sparkle's Secret Shipfic Folder">
	<meta property="og:image" content="http://tsssf.net/img/tsssf-box.png">

	<meta property="og:url" content="http://www.tsssf.net">
	<meta property="og:type" content="website">
`;

var HTML = `

<div id='playerArea' class='playerArea'>
	<h2 class="noTopMargin">Players</h2>
	<div id='playerList'></div>
</div>

<div id='rightSide'>

	<div class='center'>
		<div id='tabs' class="popupTabs off">
			<div id='joinGameTab' onclick="changePage(this, 'pageJoin')" class="selected">Join Game</div>
			<div id='gameOptionsTab' onclick="changePage(this, 'pageOptions')">Game Options</div>
			<div id='chooseCardsTab' onclick="changePage(this, 'pageCards')">Choose cards</div>
		</div>
		<div id='main' class='main pageJoin unregistered'>
			
			<div id='mobilePlayerArea' class='mobileOnly'>
				<h2>Players</h2>
				<div id='playerList2'></div>
			</div>

			<div id='joinGameInfo'>
				<p style='margin-top: 0px;'>Invite other players to join with this link</p>
				<input type="text" id='inviteURL' readonly />

				<div id='chooseName'>
					<h2 class='bothMargins'>Choose a name</h2>
					<input type='text' id='playerName' maxlength="20" />
					<button onclick='register();'>Join</button>
				</div>
			</div>

			<div class='startButtonArea mobileOnly'>
				<button onclick="startGame();">Start Game</button>
			</div>

			<div id='gameOptionsInfo'>
				<h2>Rule Enforcement</h2>
				<!-- div><input type='radio' name='gamerules' disabled><label for=''>Full rules - Coming soon!</label></div -->
				<div><input id='turnsOnly' type='radio' name='gamerules' checked><label for='turnsOnly'>Turns - Only one person can play at a time</label></div>
				<div><input id='sandbox' type='radio' name='gamerules' ><label for='sandbox'>Sandbox - Everyone can play simultaneously</label></div>

				<h2 class='bothMargins'>Other options</h2>
				<div><input type='checkbox' id='keepLobbyOpen'><label for='keepLobbyOpen'>Keep lobby open during game<br>You can also toggle this in game</label></div>
			</div>

			<div id='chooseCardsInfo'>
				<h2>Expansions</h2>
				<div class='cardbox' id='Core-deck-select' deck="Core.*">
					<div class='shield'></div>
					<img src="/img/core-box.png" />
				</div>
				<div class='cardbox' id='EC-deck-select' deck="EC.*">
					<div class='shield'></div>
					<img src="/img/ec-box.png" />
				</div>
				<div class='cardbox' id='PU-deck-select' deck="PU.*">
					<div class='shield'></div>
					<img src="/img/pu-box.png" />
				</div>
				<div class='cardbox' deck="NoHoldsBarred.*">
					<div class='shield'></div>
					<img src="/img/noholds-box.png" />
				</div>
				<h2 class="bothMargins">Individual cards</h2>
				<div id='cardSelectors'>
				</div>
			</div>

			<div class='startButtonArea'>
				<button onclick="startGame();">Start Game</button>
			</div>

			<div id='closedLobby'>
				<p>Game in session. The lobby for this game is closed</p>
				<!--<p>If this is a mistake, reach out to the game's host. They can choose to allow new players to join mid game.</p>-->

			</div>

		</div>
	</div>

	
</div>
`
export {HTML, HEAD}