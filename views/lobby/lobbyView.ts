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
	<h2 class="noTopMargin">{{LobbyPlayers}}</h2>
	<div id='playerList'></div>
</div>

<div id='rightSide'>

	<div class='center'>
		<div id='tabs' class="popupTabs off">
			<div id='joinGameTab' onclick="changePage(this, 'pageJoin')" class="selected">{{LobbyJoinGame}}</div>
			<div id='gameOptionsTab' onclick="changePage(this, 'pageOptions')">{{LobbyGameOptions}}</div>
			<div id='chooseCardsTab' onclick="changePage(this, 'pageCards')">{{LobbyChooseCards}}</div>
			<div onclick="changePage(this, 'pageStartCard')">{{LobbyStartCard}}</div>
		</div>
		<div id='main' class='main pageJoin unregistered'>
			
			<div id='mobilePlayerArea' class='mobileOnly'>
				<h2>{{LobbyPlayers}}</h2>
				<div id='playerList2'></div>
			</div>

			<div id='joinGameInfo'>
				<p style='margin-top: 0px;'>{{LobbyInvitePlayers}}</p>
				<input type="text" id='inviteURL' readonly />

				<div id='chooseName'>
					<h2 class='bothMargins'>{{LobbyChooseName}}</h2>
					<input type='text' id='playerName' maxlength="20" />
					<button onclick='register();'>{{LobbyJoin}}</button>
				</div>
			</div>

			<div class='startButtonArea mobileOnly'>
				<button onclick="startGame();">{{LobbyStartGame}}</button>
			</div>

			<div id='gameOptionsInfo'>
				<h2>{{LobbyRuleEnforcement}}</h2>
				<!-- div><input type='radio' name='gamerules' disabled><label for=''>Full rules - Coming soon!</label></div -->
				<div><input id='turnsOnly' type='radio' name='gamerules' checked><label for='turnsOnly'>{{LobbyRulesTurns}}</label></div>
				<div><input id='sandbox' type='radio' name='gamerules' ><label for='sandbox'>{{LobbyRulesSandbox}}</label></div>

				<h2 class='bothMargins'>{{LobbyOtherOptions}}</h2>
				<div><input type='checkbox' id='keepLobbyOpen'><label for='keepLobbyOpen'>{{LobbyKeepLobbyOpen}}</label></div>

				<h2 class="bothMargins">{{LobbyTeamsOptions}}</h2>
				<p>{{LobbyTeamsOptionsText}}</p>
				<div id='teams'></div>
			</div>

			<div id='startCardInfo'>
				<h2>{{LobbyPickStart}}</h2>
				<div id='startCards'></div>
				<p id='startCardDetails'></p>
			</div>

			<div id='chooseCardsInfo'>
				<h2>{{LobbyExpansions}}</h2>
				<div id='expansions'></div>
				<h2 class="bothMargins">{{LobbyIndividualCards}}</h2>
				<div id='cardSelectors'></div>
				<h2 class="bothMargins"><a href="/info/addYourOwnCards" target="_blank"><span>{{LobbyAddYourOwnCards}}</span><img height="30px" src="/img/help-blue.svg"></a></h2>
				<p>
					{{LobbyUploadDisclaimer}}
				</p>
				<p>{{LobbyArtistInfo}}</p>
				<div><label>{{LobbyChooseFile}}:</label> <input id='packUpload' type="file" accept=".json" /></div>

				<pre><code id='uploadErrors'></code></pre>

			</div>

			<div class='startButtonArea'>
				<button onclick="startGame();">{{LobbyStartGame}}</button>
			</div>

			<div class='waitingOnHost'>
				<p>{{LobbyWaiting}}</p>
			</div>

			<div id='closedLobby'>
				<p>{{LobbyGameInSession}}</p>
				<!--<p>If this is a mistake, reach out to the game's host. They can choose to allow new players to join mid game.</p>-->

			</div>

		</div>
	</div>

	
</div>
`
export {HTML, HEAD}