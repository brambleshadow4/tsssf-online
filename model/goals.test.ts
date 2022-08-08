import {GameInstance} from "../server/gameServer.js";
import * as cm from "./cardManager.js";
import {test, expect, beforeEach, group} from "./testFramework.js";
import {
	isPony,
	isShip,
	isGoal,
	Card,
	Location, GameOptions, Player, GameModel,
	allCardsGameOptions
} from "./lib.js";

import {typecheckGoal} from "./goalCriteria.js";
import Turnstate from "./turnstate.js";

interface MockPlayer extends Player
{
	grab(...cards: Card[]): void;
	drawGoal(goalCard: Card): void;
	move(card: Card, start: Location, end: Location): void;
	setEffect(card: Card, prop: string, value: string): void;
	endTurn(): void;
}

function expectGoalUnachieved(game: GameModel, goal: Card)
{
	let i = game.currentGoals.indexOf(goal);
	expect(i >= 0 && i <= 3).toBe(true);
	expect(game.achievedGoals.has(goal)).toBe(false);
}

function expectGoalAchieved(game: GameModel, goal: Card)
{
	let i = game.currentGoals.indexOf(goal);

	expect(i >= 0 && i <= 3).toBe(true);
	expect(game.achievedGoals.has(goal)).toBe(true);
}

function setupGame(setupOptions?:{
	cardDecks?: string[],
	startCard?: string

}):[GameInstance, MockPlayer]
{	
	let game = new GameInstance();
	

	cm.init(allCardsGameOptions());

	let fakeSocket = {
		isAlive: true,
		send:() => {}
	} as any;
	let sendMessage = game.onMessage(game, fakeSocket);

	let fakePlayer = {
		disconnected: 0,
		isHost: false,
		name: "Test",
		socket: fakeSocket,
		team: "",
		hand: [],
		winnings: [],
		ponies: 0,
		ships: 0,
		id: 42, 
		grab: function(...cards: Card[])
		{
			for(let card of cards)
			{
				if(isShip(card))
				{
					let i = game.model.shipDrawPile.indexOf(card);
					if (i == -1) return;
					game.model.shipDrawPile.splice(i,1);
					fakePlayer.hand.push(card);
					game.model.cardLocations[card] = "player," + fakePlayer.name;
				}
				if(isPony(card))
				{
					let i = game.model.ponyDrawPile.indexOf(card);
					if (i == -1) return;
					game.model.ponyDrawPile.splice(i,1);
					fakePlayer.hand.push(card);
					game.model.cardLocations[card] = "player," + fakePlayer.name;
				}
			}
			
		},
		drawGoal: function(goalCard: Card)
		{
			let i = game.model.goalDrawPile.indexOf(goalCard);
			game.model.goalDrawPile.splice(i, 1);
			game.model.currentGoals[0] = goalCard
			game.model.cardLocations[goalCard] = "goal,1";
		},
		move: function(card: Card, start: Location, end: Location)
		{
			sendMessage("move;" + card + ";" + start + ";" + end);
		},
		setEffect: function(card: Card, prop: string, value: string)
		{
			sendMessage("effects;" + card + ";" + prop + ";" + value);
		},
		endTurn: function()
		{
			sendMessage("endturn");
		}
	} as MockPlayer;

	game.model.players.push(fakePlayer);
	game.model.mode = "server";
	game.setLobbyOptions({
		cardDecks: setupOptions?.cardDecks || ["Core.*"],
		ruleset: "turnsOnly",
		startCard: setupOptions?.startCard || "Core.Start.FanficAuthorTwilight",
		teams: {}
	} as GameOptions);
	game.startGame();

	return [game, fakePlayer];
}

function hasShipPair(ships: [string, string][], pony1: string, pony2: string)
{

	let val = false;
	for(let i =0; i<ships.length; i++)
	{
		if ((ships[i][0] == pony1 && ships[i][1] == pony2)
			|| (ships[i][0] == pony2 && ships[i][1] == pony1))
		{
			val = true;
		}
	}

	try
	{
		expect(val).toBe(true);
	}	
	catch(e)
	{
		throw new Error("Expected pair " + pony1 + "/" + pony2);
	}
}

function evalGoalLogic(model: GameModel, goalLogic: string): boolean
{
	let fakeCard = { goalLogic };
	typecheckGoal(fakeCard);
	return (fakeCard as any).goalFun(model);
}



export default function(){

	test("ShippedWithOppositeGenderedSelf", () => {

		let [game, player] = setupGame();

		let goal = "Core.Goal.BuddingCuriosity";
		let ship = "Core.Ship.DudeLooksLikeALady";
		let twi2 = "Core.Pony.SuperSpyTwilight";

		player.drawGoal(goal);
		expectGoalUnachieved(game.model, goal);

		player.grab(ship);
		player.grab(twi2);

		player.move(ship, "player,Test", "sr,0,0");
		player.move(twi2, "player,Test", "p,1,0");

		player.setEffect(twi2, "gender", "male");

		expectGoalAchieved(game.model, goal);
	});

	test("PlayPonies", ()=>{

		let [game, player] = setupGame();
		let goal = "Core.Goal.ChancellorPuddingheadsEntourage";

		let ships = ["Core.Ship.BadPonyGoToMyRoom", "Core.Ship.BoredOnASundayAfternoon","Core.Ship.CheckingItOffMyList"];
		let ponies = ["Core.Pony.BigMacintosh","Core.Pony.BonBon","Core.Pony.Braeburn"];

		player.drawGoal(goal);
		ships.forEach(x => player.grab(x));
		ponies.forEach(x => player.grab(x));

		player.move(ships[0], "player,Test", "sr,0,0");
		player.move(ponies[0], "player,Test", "p,1,0");

		player.move(ships[1], "player,Test", "sb,1,0");
		player.move(ponies[1], "player,Test", "p,1,1");

		expectGoalUnachieved(game.model, goal);

		player.move(ships[2], "player,Test", "sr,0,1");
		player.move(ponies[2], "player,Test", "p,0,1");

		expectGoalAchieved(game.model, goal);

	});


	test("changeling disguise on play doesn't count as a breakup", () =>{

		let [game, player] = setupGame();
		let changeling = "Core.Pony.UnicornChangeling";
		let ship = "Core.Ship.BadPonyGoToMyRoom";
		player.grab(changeling);
		player.grab(ship);


		player.move(ship, "player,Test", "sr,0,0");
		player.move(changeling, "player,Test", "p,1,0");

		player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");

		expect(game.model.turnstate!.brokenShips.length).toBe(0);

	});

	group("changeling redisguise", () =>{


		let game: GameInstance;
		let player: MockPlayer;
		let ship1 = "Core.Ship.BadPonyGoToMyRoom"
		let ship2 = "Core.Ship.BoredOnASundayAfternoon"
		let ship3 = "Core.Ship.CheckingItOffMyList";
		let ship4 = "Core.Ship.CabinInTheWoodsAwooo";
		let startCard = "Core.Start.FanficAuthorTwilight";

		let p1 = "Core.Pony.BigMacintosh";
		let p2 = "Core.Pony.BonBon";
		let changeling = "Core.Pony.UnicornChangeling";

		//   S - X
		//   |   |
		//   A - B 

		beforeEach(() => {
			[game, player] = setupGame();
			
			[ship1, ship2, ship3, ship4, p1, p2, changeling].forEach(x => player.grab(x));

			player.move(ship2, "player,Test", "sd,0,0");
			player.move(p1, "player,Test", "p,0,1");

			player.move(ship3, "player,Test", "sr,0,1");
			player.move(p2, "player,Test", "p,1,1");

			player.endTurn();
		});

		test("changeling redisguising breaks up existing ships", () =>{

			player.move(ship1, "player,Test", "sr,0,0");
			player.move(changeling, "player,Test", "p,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");

			player.move(ship4, "player,Test", "sd,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			// last ship is slide between p2 (Bon Bon) and changeling

			expect(game.model.turnstate!.brokenShips.length).toBe(1);
			hasShipPair(game.model.turnstate!.brokenShips, startCard, changeling + ":1");

		});

		test("changeling redisguise doesn't change what pony was played", () =>{

			player.move(ship1, "player,Test", "sr,0,0");
			player.move(changeling, "player,Test", "p,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");


			expect(game.model.turnstate!.playedPonies.length).toBe(1);
			expect(game.model.turnstate!.playedPonies[0]).toBe(changeling + ":1");

			player.move(ship4, "player,Test", "sd,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			expect(game.model.turnstate!.playedPonies.length).toBe(1);
			expect(game.model.turnstate!.playedPonies[0]).toBe(changeling + ":1");
		});

		test("changeling redisguise counts played cards correctly", () =>{

			player.move(ship1, "player,Test", "sr,0,0");
			player.move(changeling, "player,Test", "p,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");
			player.move(ship4, "player,Test", "sd,1,0");

			let playedShips = game.model.turnstate!.playedShips;
			expect(playedShips.length).toBe(2);
			hasShipPair(playedShips, changeling+":1", p2)
			hasShipPair(game.model.turnstate!.playedShips, changeling+":1", startCard)

			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			playedShips = game.model.turnstate!.playedShips;
			expect(playedShips.length).toBe(2);
			hasShipPair(playedShips, changeling+":1", startCard)
			hasShipPair(playedShips, changeling+":2", p2)
		});

	})

	
	group("love poison changeling", () =>{


		let game: GameInstance, player: MockPlayer;
		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon"
		let lovePoison = "Core.Ship.LovePoisonIsNoJoke";

		let pony = "Core.Pony.DramaticallyWoundedRarity";
		let changeling = "Core.Pony.UnicornChangeling";

		// start - pony - change:1
		//           |   
		//        change:2

		beforeEach(() =>{

			[game, player] = setupGame();
			[ship1, ship2, lovePoison, pony, changeling].forEach(x => player.grab(x));


			player.move(ship1, "player,Test", "sr,0,0");
			player.move(pony, "player,Test", "p,1,0");
			player.endTurn();

			player.move(ship2, "player,Test", "sr,1,0");
			player.move(changeling, "player,Test", "p,2,0");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");
		});


		test("love poison changeling breaks 1 ship", () =>{

			let brokenShips = game.model.turnstate!.brokenShips;
			expect(brokenShips.length).toBe(0);

			player.move(lovePoison, "player,Test", "sd,1,0");
			player.move(changeling, "p,2,0", "p,1,1");

			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			brokenShips = game.model.turnstate!.brokenShips;
			expect(brokenShips.length).toBe(1);
			hasShipPair(brokenShips, changeling+":1", pony)
		});

		test("love poison changeling counts as 2 played ships", () =>{

			let playedShips = game.model.turnstate!.playedShips;
			expect(playedShips.length).toBe(1);
			hasShipPair(playedShips, changeling+":1", pony)

			player.move(lovePoison, "player,Test", "sd,1,0");
			player.move(changeling, "p,2,0", "p,1,1");
			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			playedShips = game.model.turnstate!.playedShips;

			expect(playedShips.length).toBe(2);
			hasShipPair(playedShips, changeling+":1", pony)
			hasShipPair(playedShips, changeling+":2", pony)
			
		});
	})


	group("changeling swap", () =>{

		//   B-C-D       B-C-D        B-Y-D
		//   |      ->   | |    ->    | |
		// S-X-A       S-X-A        S-C-A

		let game: GameInstance, player: MockPlayer;

		let start = "Core.Start.FanficAuthorTwilight"
		let changeling = "Core.Pony.UnicornChangeling";
		let ponyA = "Core.Pony.ApplejackBackgroundPony";
		let ponyB = "Core.Pony.BerryPunch";
		let ponyC = "Core.Pony.Caramel";
		let ponyD = "Core.Pony.DramaticallyWoundedRarity";

		let ship1 = "Core.Ship.BadPonyGoToMyRoom"
		let ship2 = "Core.Ship.BoredOnASundayAfternoon"
		let ship3 = "Core.Ship.CheckingItOffMyList";
		let ship4 = "Core.Ship.CabinInTheWoodsAwooo";
		let ship5 = "Core.Ship.Amnesia";
		let ship6 = "Core.Ship.BeachEpisode";

		beforeEach(() => {

			[game, player] = setupGame();
			player.grab(ponyA, ponyB, ponyC, ponyD, changeling, ship1, ship2, ship3, ship4, ship5, ship6);

			player.move(ship1, "player,Test", "sr,0,0");
			player.move(changeling, "player,Test", "p,1,0");
			player.move(ship2, "player,Test", "sr,1,0");
			player.move(ponyA, "player,Test", "p,2,0");
			player.move(ship3, "player,Test", "sd,1,-1");
			player.move(ponyB, "player,Test", "p,1,-1");
			player.move(ship4, "player,Test", "sr,1,-1");
			player.move(ponyC, "player,Test", "p,2,-1");
			player.move(ship5, "player,Test", "sr,2,-1");
			player.move(ponyD, "player,Test", "p,3,-1");

			player.endTurn();

			player.move(ship6, "player,Test", "sd,2,-1"); // activate a swap ability

			player.move(ponyC, "p,2,-1", "offset,2,-1");
			player.move(changeling, "p,1,0", "p,2,-1");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");
			player.move(ponyC, "offset,2,-1", "p,1,0");
		});

		test("changeling swap breaks changeling ships", () =>{

			let brokenShips = game.model.turnstate!.brokenShips;

			expect(brokenShips.length).toBe(4);
			hasShipPair(brokenShips, changeling+":0", start);
			hasShipPair(brokenShips, changeling+":0", ponyA);
			hasShipPair(brokenShips, changeling+":0", ponyB);
			hasShipPair(brokenShips, ponyC, ponyD);

		});

		test("changeling swap played ships", () =>{

			let playedShips = game.model.turnstate!.playedShips;

			expect(playedShips.length).toBe(1);
			hasShipPair(playedShips, ponyC, ponyA);
	
		});

		test("changeling swap played ponies", () =>{
			expect(game.model.turnstate!.playedPonies.length).toBe(0);		
		});

		test("changeling swap played ship cards", () =>{
			expect(game.model.turnstate!.playedShipCards.length).toBe(1);		
		});

	});
	

	test("BreakShip: It's not evil w/ changeling", () =>{

		let [game, player] = setupGame();
		let goal = "Core.Goal.ItsNotEvil";

		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon"
		let lovePoison = "Core.Ship.LovePoisonIsNoJoke";

		let pony = "Core.Pony.DramaticallyWoundedRarity";
		let changeling = "Core.Pony.UnicornChangeling";
		

		player.drawGoal(goal);
		player.grab(ship1, ship2, lovePoison, pony, changeling);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(pony, "player,Test", "p,1,0");

		player.move(ship2, "player,Test", "sr,1,0");
		player.move(changeling, "player,Test", "p,2,0");
		player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");

		player.move(lovePoison, "player,Test", "sd,1,0");
		player.move(changeling, "p,2,0", "p,1,1");
		player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

		expectGoalAchieved(game.model, goal);
	});


	test("Replace changling only breaks ships once", ()=>{

		let [game, player] = setupGame();
		let start = "Core.Start.FanficAuthorTwilight";
		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";
		let pony1 = "Core.Pony.DramaticallyWoundedRarity";
		let pony2 = "Core.Pony.StarswirlTheBearded";
		let changeling = "Core.Pony.UnicornChangeling";

		player.grab(ship1, ship2, pony1, pony2, changeling);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(pony1, "player,Test", "p,1,0");
		player.move(ship2, "player,Test", "sr,1,0");
		player.move(pony2, "player,Test", "p,2,0");

		player.move(pony1, "p,1,0", "offset,1,0");
		player.move(changeling, "player,Test", "p,1,0");

		expect(game.model.turnstate!.brokenShips.length).toBe(2);
		hasShipPair(game.model.turnstate!.brokenShips, start, pony1)
		hasShipPair(game.model.turnstate!.brokenShips, pony2, pony1)

		player.setEffect(changeling, "disguise", "Core.Pony.VinylScratch");

		expect(game.model.turnstate!.brokenShips.length).toBe(2);
		hasShipPair(game.model.turnstate!.brokenShips, start, pony1)
		hasShipPair(game.model.turnstate!.brokenShips, pony2, pony1)


		expect(game.model.turnstate!.playedShips.length).toBe(4);
		hasShipPair(game.model.turnstate!.playedShips, pony1, start)
		hasShipPair(game.model.turnstate!.playedShips, pony1, pony2)
		hasShipPair(game.model.turnstate!.playedShips, start, changeling+":1")
		hasShipPair(game.model.turnstate!.playedShips, pony2, changeling+":1")
	});

	test("genderSwapped + CharityAuction", () => {

		let [game, player] = setupGame();
		let goal = "Core.Goal.CharityAuction";
		player.drawGoal(goal);

		let ship1 = "Core.Ship.CanITellYouASecret";
		let ship2 = "Core.Ship.DudeLooksLikeALady";
		let pony1 = "Core.Pony.DramaticallyWoundedRarity";
		let pony2 = "Core.Pony.StarswirlTheBearded";

		player.grab(ship1, ship2, pony1, pony2);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(pony1, "player,Test", "p,1,0");

		player.setEffect(pony1, "gender", "male");

		player.move(ship2, "player,Test", "sd,1,0");
		player.move(pony2, "player,Test", "p,1,1");
		player.setEffect(pony2, "gender", "female");

		expectGoalAchieved(game.model, goal);
	});

	test("PlayLovePoisons", () => {

		let [game, player] = setupGame();
		let goal = "Core.Goal.Epidemic";
		player.drawGoal(goal);

		let pony = "Core.Pony.DramaticallyWoundedRarity";
		let lovePoison1 = "Core.Ship.LovePoisonIsNoJoke";
		let lovePoison2 = "Core.Ship.ShmoopyBoo";

		player.grab(pony, lovePoison1, lovePoison2);

		player.move(lovePoison1, "player,Test", "sr,0,0");
		player.move(pony, "player,Test", "p,1,0");

		expectGoalUnachieved(game.model, goal);

		player.move(lovePoison2, "player,Test", "sd,0,0");
		player.move(pony, "p,1,0", "p,0,1");


		expectGoalAchieved(game.model, goal);
	});

	test("PlayPonies takes into account card.count property", () =>{

		let [game, player] = setupGame();
		let goal = "Core.Goal.QueenPlatinumsCourt";
		player.drawGoal(goal);

		let ship1 = "Core.Ship.CanITellYouASecret";
		let ship2 = "Core.Ship.DudeLooksLikeALady";
		let flimFlam = "Core.Pony.FlimAndFlam";
		let unicorn = "Core.Pony.HeartlessDictatorRarity";
		player.grab(ship1, ship2, flimFlam, unicorn);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(unicorn, "player,Test", "p,1,0");

		expectGoalUnachieved(game.model, goal);

		player.move(ship1, "player,Test", "sr,1,0");
		player.move(flimFlam, "player,Test", "p,2,0");

		expectGoalAchieved(game.model, goal);
	});

	test("Alicorn Big Mac + Star Student Twilight achieve Pretty Pretty Princess", () =>{

		let [game, player] = setupGame({
			cardDecks: ["Core.*", "HorriblePeople.2015Workshop.*"],
			startCard: "ChildrenOfKefentse.Promo.Start.FanficEditorStarlight"
		});
		
		let goal = "Core.Goal.PrettyPrettyPrincess";
		player.drawGoal(goal);

		let twi = "Core.Pony.StarStudentTwilight";
		let bigmac = "HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh";
		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";

		player.grab(ship1, ship2, twi, bigmac);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(bigmac, "player,Test", "p,1,0");

		expectGoalUnachieved(game.model, goal);

		player.move(ship2, "player,Test", "sr,1,0");
		player.move(twi, "player,Test", "p,2,0");

		expectGoalAchieved(game.model, goal);
	});

	test("larson effect still applies when turn ends", () =>{

		let [game, player] = setupGame({
			cardDecks: ["Core.*", "HorriblePeople.2015Workshop.*"],
			startCard: "ChildrenOfKefentse.Promo.Start.FanficEditorStarlight"
		});
		
		let goal = "Core.Goal.PrettyPrettyPrincess";
		player.drawGoal(goal);

		let twi = "Core.Pony.StarStudentTwilight";
		let bigmac = "HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh";
		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";

		player.grab(ship1, ship2, twi, bigmac);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(bigmac, "player,Test", "p,1,0");

		player.move(ship2, "player,Test", "sr,1,0");
		player.move(twi, "player,Test", "p,2,0");

		expectGoalAchieved(game.model, goal);

		player.endTurn();

		expectGoalAchieved(game.model, goal);

	});

	test("larson effect always transforms changelings", () =>{

		let [game, player] = setupGame({
			cardDecks: ["Core.*", "HorriblePeople.2015Workshop.*"]}
		);
		
		let goal = "Core.Goal.ItsNotExactlyCheating";
		player.drawGoal(goal);

		let changeling = "Core.Pony.UnicornChangeling";
		let bigmac = "HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh";
		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";

		player.grab(ship1, ship2, changeling, bigmac);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(bigmac, "player,Test", "p,1,0");

		player.move(ship2, "player,Test", "sr,-1,0");
		player.move(changeling, "player,Test", "p,-1,0");

		expectGoalAchieved(game.model, goal);
		player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");
		expectGoalAchieved(game.model, goal);

	});

	test("fullCopy keeps both genders", () => {

		let [game, player] = setupGame({
			cardDecks: ["Core.*", "NoHoldsBarred.*"]}
		);

		let pixelPrism = "NoHoldsBarred.Pony.PixelPrism";
		let male = "Core.Pony.BigMacintosh";
		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";

		player.grab(pixelPrism, ship1, male, ship2);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(male, "player,Test", "p,1,0");
		player.move(ship2, "player,Test", "sd,0,0");
		player.move(pixelPrism, "player,Test", "p,0,1");

		expect(evalGoalLogic(game.model, "ExistsShip(gender=male, gender=female, 2)")).toBe(false);

		player.setEffect(pixelPrism, "fullCopy", male);

		expect(evalGoalLogic(game.model, "ExistsShip(gender=male, gender=female, 2)")).toBe(true);
		expect(evalGoalLogic(game.model, "ExistsShip(gender=female, gender=female, 1)")).toBe(true);
	});

	test("fullCopy keeps both races", () => {

		let [game, player] = setupGame({
			cardDecks: ["Core.*", "NoHoldsBarred.*"]}
		);

		let pixelPrism = "NoHoldsBarred.Pony.PixelPrism";
		let male = "Core.Pony.BigMacintosh";
		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";

		player.grab(pixelPrism, ship1, male, ship2);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(male, "player,Test", "p,1,0");
		player.move(ship2, "player,Test", "sd,0,0");
		player.move(pixelPrism, "player,Test", "p,0,1");

		expect(evalGoalLogic(game.model, "ExistsPony(race=earth, 2)")).toBe(false);
		expect(evalGoalLogic(game.model, "ExistsPony(race=unicorn, 2)")).toBe(true);

		player.setEffect(pixelPrism, "fullCopy", male);
		
		expect(evalGoalLogic(game.model, "ExistsPony(race=earth, 2)")).toBe(true);
		expect(evalGoalLogic(game.model, "ExistsPony(race=unicorn, 2)")).toBe(true);
	});

	test("fullCopy keeps both names", () => {

		let [game, player] = setupGame({
			cardDecks: ["Core.*", "NoHoldsBarred.*"]}
		);

		let pixelPrism = "NoHoldsBarred.Pony.PixelPrism";
		let male = "Core.Pony.BigMacintosh";
		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";

		player.grab(pixelPrism, ship1, male, ship2);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(male, "player,Test", "p,1,0");
		player.move(ship2, "player,Test", "sd,0,0");
		player.move(pixelPrism, "player,Test", "p,0,1");

		player.setEffect(pixelPrism, "fullCopy", male);
		
		expect(evalGoalLogic(game.model, "ExistsShip(name=Twilight Sparkle, name=Big Macintosh, 2)")).toBe(true);
		expect(evalGoalLogic(game.model, "ExistsShip(name=Twilight Sparkle, name=Pixel Prism)")).toBe(true);
	});

	test("aloe/lotus ships count as two ships", () => {

		let [game, player] = setupGame();

		let aloelotus = "Core.Pony.AloeAndLotus";
		let malePony = "Core.Pony.BigMacintosh";
		let femalePony = "Core.Pony.StarStudentTwilight";

		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";
		let ship3 = "Core.Ship.CheckingItOffMyList";

		player.grab(aloelotus, malePony, femalePony, ship1, ship2);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(malePony, "player,Test", "p,1,0");

		player.endTurn();
		expect(evalGoalLogic(game.model, "PlayShips(gender=male, gender=female, 2)")).toBe(false);

		player.move(ship2, "player,Test", "sr,1,0");
		player.move(aloelotus, "player,Test", "p,2,0");

		expect(evalGoalLogic(game.model, "PlayShips(gender=male, gender=female, 2)")).toBe(true);
	})

	test("goals w/ card= prop", () =>{

		let [game, player] = setupGame({
			cardDecks: ["Core.*", "HorriblePeople.DungeonDelvers.*"]
		});

		let goal = "HorriblePeople.DungeonDelvers.Goal.YouMeetInATavern";

		let pony1 = "HorriblePeople.DungeonDelvers.Pony.EnchantressRarity";
		let pony2 = "Core.Pony.DruidFluttershy";
		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";

		player.grab(pony1, pony2, ship1, ship2);
		player.drawGoal(goal);
		
		expectGoalUnachieved(game.model, goal);

		player.move(ship1, "player,Test", "sr,0,0");
		player.move(pony1, "player,Test", "p,1,0");
		player.move(ship2, "player,Test", "sr,1,0");
		player.move(pony2, "player,Test", "p,2,0");

		expectGoalAchieved(game.model, goal);
	});

	//test("ExistsChain", () =>{
		//expect(0).toBe("unimplemented");
	//});

	//test("PlayShips", () =>{
		//expect(0).toBe("unimplemented");
	//});

	// accidental play doesn't count as two plays

	// how many ships are broken when you swap cards

	// double ships

	// swap counts

	// Allof EC.Goal.Swinging

	// Recolor



};