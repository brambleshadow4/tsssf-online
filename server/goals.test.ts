import {GameModel, Player} from "./gameServer.js";
import * as cm from "./cardManager.js";
import {test, expect, beforeEach, group} from "./testFramework.js";
import {
	isPony,
	isShip,
	isGoal,
	Card, Location, GameOptions
} from "./lib.js";

import {typecheckGoal} from "./goalCriteria.js";

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
	let i = game.currentGoals.map(x => x.card).indexOf(goal);
	expect(i >= 0 && i <= 3).toBe(true);
	expect(game.currentGoals[i].achieved).toBe(false);
}

function expectGoalAchieved(game: GameModel, goal: Card)
{
	let i = game.currentGoals.map(x => x.card).indexOf(goal);

	expect(i >= 0 && i <= 3).toBe(true);
	expect(game.currentGoals[i].achieved).toBe(true);
}


function setupGame(setupOptions?:{
	cardDecks?: string[],
	startCard?: string

}):[GameModel, MockPlayer]
{	
	let game = new GameModel();

	cm.init(["*"], {});

	let fakeSocket = {
		isAlive: true,
		send:() => {}
	} as any;
	let sendMessage = game.onMessage(game, fakeSocket);

	let fakePlayer = {
		name: "Test",
		socket: fakeSocket,
		hand: [],
		winnings: [],
		id: 42, 
		grab: function(...cards: Card[])
		{
			for(let card of cards)
			{
				if(isShip(card))
				{
					let i = game.shipDrawPile.indexOf(card);
					if (i == -1) return;
					game.shipDrawPile.splice(i,1);
					fakePlayer.hand.push(card);
					game.cardLocations[card] = "player," + fakePlayer.name;
				}
				if(isPony(card))
				{
					let i = game.ponyDrawPile.indexOf(card);
					if (i == -1) return;
					game.ponyDrawPile.splice(i,1);
					fakePlayer.hand.push(card);
					game.cardLocations[card] = "player," + fakePlayer.name;
				}
			}
			
		},
		drawGoal: function(goalCard: Card)
		{
			let i = game.goalDrawPile.indexOf(goalCard);
			game.goalDrawPile.splice(i, 1);
			game.currentGoals[0] = {card: goalCard, achieved: false};
			game.cardLocations[goalCard] = "goal,1";
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

	game.players.push(fakePlayer);
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
		expectGoalUnachieved(game, goal);

		player.grab(ship);
		player.grab(twi2);

		player.move(ship, "hand", "sr,0,0");
		player.move(twi2, "hand", "p,1,0");

		player.setEffect(twi2, "gender", "male");

		expectGoalAchieved(game, goal);
	});

	test("PlayPonies", ()=>{

		let [game, player] = setupGame();
		let goal = "Core.Goal.ChancellorPuddingheadsEntourage";

		let ships = ["Core.Ship.BadPonyGoToMyRoom", "Core.Ship.BoredOnASundayAfternoon","Core.Ship.CheckingItOffMyList"];
		let ponies = ["Core.Pony.BigMacintosh","Core.Pony.BonBon","Core.Pony.Braeburn"];

		player.drawGoal(goal);
		ships.forEach(x => player.grab(x));
		ponies.forEach(x => player.grab(x));

		player.move(ships[0], "hand", "sr,0,0");
		player.move(ponies[0], "hand", "p,1,0");

		player.move(ships[1], "hand", "sb,1,0");
		player.move(ponies[1], "hand", "p,1,1");

		expectGoalUnachieved(game, goal);

		player.move(ships[2], "hand", "sr,0,1");
		player.move(ponies[2], "hand", "p,0,1");

		expectGoalAchieved(game, goal);

	});


	test("changeling disguise on play doesn't count as a breakup", () =>{

		let [game, player] = setupGame();
		let changeling = "Core.Pony.UnicornChangeling";
		let ship = "Core.Ship.BadPonyGoToMyRoom";
		player.grab(changeling);
		player.grab(ship);


		player.move(ship, "hand", "sr,0,0");
		player.move(changeling, "hand", "p,1,0");

		player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");

		expect(game.turnstate!.brokenShips.length).toBe(0);

	});

	group("changeling redisguise", () =>{


		let game: GameModel;
		let player: MockPlayer;
		let ship1 = "Core.Ship.BadPonyGoToMyRoom"
		let ship2 = "Core.Ship.BoredOnASundayAfternoon"
		let ship3 = "Core.Ship.CheckingItOffMyList";
		let ship4 = "Core.Ship.CabinInTheWoodsAwooo";
		let startCard = "Core.Start.FanficAuthorTwilight";

		let p1 = "Core.Pony.BigMacintosh";
		let p2 = "Core.Pony.BonBon";
		let changeling = "Core.Pony.UnicornChangeling";

		// start -  p2 
		//   |      |
		//   p1  - change

		beforeEach(() => {
			[game, player] = setupGame();
			
			[ship1, ship2, ship3, ship4, p1, p2, changeling].forEach(x => player.grab(x));

			player.move(ship2, "hand", "sd,0,0");
			player.move(p1, "hand", "p,0,1");

			player.move(ship3, "hand", "sr,0,1");
			player.move(p2, "hand", "p,1,1");

			player.endTurn();
		});

		test("changeling redisguising breaks up existing ships", () =>{

			player.move(ship1, "hand", "sr,0,0");
			player.move(changeling, "hand", "p,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");

			player.move(ship4, "hand", "sd,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			// last ship is slide between p2 (Bon Bon) and changeling

			expect(game.turnstate!.brokenShips.length).toBe(1);
			hasShipPair(game.turnstate!.brokenShips, startCard, changeling + ":1");

		});

		test("changeling redisguise doesn't change what pony was played", () =>{

			player.move(ship1, "hand", "sr,0,0");
			player.move(changeling, "hand", "p,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");


			expect(game.turnstate!.playedPonies.length).toBe(1);
			expect(game.turnstate!.playedPonies[0]).toBe(changeling + ":1");

			player.move(ship4, "hand", "sd,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			expect(game.turnstate!.playedPonies.length).toBe(1);
			expect(game.turnstate!.playedPonies[0]).toBe(changeling + ":1");
		});

		test("changeling redisguise counts played cards correctly", () =>{

			player.move(ship1, "hand", "sr,0,0");
			player.move(changeling, "hand", "p,1,0");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");
			player.move(ship4, "hand", "sd,1,0");

			let playedShips = game.turnstate!.playedShips;
			expect(playedShips.length).toBe(2);
			hasShipPair(playedShips, changeling+":1", p2)
			hasShipPair(game.turnstate!.playedShips, changeling+":1", startCard)

			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			playedShips = game.turnstate!.playedShips;
			expect(playedShips.length).toBe(2);
			hasShipPair(playedShips, changeling+":1", startCard)
			hasShipPair(playedShips, changeling+":2", p2)
		});

	})

	
	group("love poison changeling", () =>{


		let game: GameModel, player: MockPlayer;
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


			player.move(ship1, "hand", "sr,0,0");
			player.move(pony, "hand", "p,1,0");
			player.endTurn();

			player.move(ship2, "hand", "sr,1,0");
			player.move(changeling, "hand", "p,2,0");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");
		});


		test("love poison changeling breaks 1 ship", () =>{

			let brokenShips = game.turnstate!.brokenShips;
			expect(brokenShips.length).toBe(0);

			player.move(lovePoison, "hand", "sd,1,0");
			player.move(changeling, "p,2,0", "p,1,1");

			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			brokenShips = game.turnstate!.brokenShips;
			expect(brokenShips.length).toBe(1);
			hasShipPair(brokenShips, changeling+":1", pony)
		});

		test("love poison changeling counts as 2 played ships", () =>{

			let playedShips = game.turnstate!.playedShips;
			expect(playedShips.length).toBe(1);
			hasShipPair(playedShips, changeling+":1", pony)

			player.move(lovePoison, "hand", "sd,1,0");
			player.move(changeling, "p,2,0", "p,1,1");
			player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

			playedShips = game.turnstate!.playedShips;

			expect(playedShips.length).toBe(2);
			hasShipPair(playedShips, changeling+":1", pony)
			hasShipPair(playedShips, changeling+":2", pony)
			
		});
	})


	group("changeling swap", () =>{

		//   B-C-D       B-C-D        B-Y-D
		//   |      ->   | |    ->    | |
		// S-X-A       S-X-A        S-C-A

		let game: GameModel, player: MockPlayer;

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

			player.move(ship1, "hand", "sr,0,0");
			player.move(changeling, "hand", "p,1,0");
			player.move(ship2, "hand", "sr,1,0");
			player.move(ponyA, "hand", "p,2,0");
			player.move(ship3, "hand", "sd,1,-1");
			player.move(ponyB, "hand", "p,1,-1");
			player.move(ship4, "hand", "sr,1,-1");
			player.move(ponyC, "hand", "p,2,-1");
			player.move(ship5, "hand", "sr,2,-1");
			player.move(ponyD, "hand", "p,3,-1");

			player.endTurn();

			player.move(ship6, "hand", "sd,2,-1"); // activate a swap ability

			player.move(ponyC, "p,2,-1", "offset,2,-1");
			player.move(changeling, "p,1,0", "p,2,-1");
			player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");
			player.move(ponyC, "offset,2,-1", "p,1,0");
		});

		test("changeling swap breaks changeling ships", () =>{

			let brokenShips = game.turnstate!.brokenShips;

			expect(brokenShips.length).toBe(4);
			hasShipPair(brokenShips, changeling+":0", start);
			hasShipPair(brokenShips, changeling+":0", ponyA);
			hasShipPair(brokenShips, changeling+":0", ponyB);
			hasShipPair(brokenShips, ponyC, ponyD);

		});

		test("changeling swap played ships", () =>{

			let playedShips = game.turnstate!.playedShips;

			expect(playedShips.length).toBe(1);
			hasShipPair(playedShips, ponyC, ponyA);
	
		});

		test("changeling swap played ponies", () =>{
			expect(game.turnstate!.playedPonies.length).toBe(0);		
		});

		test("changeling swap played ship cards", () =>{
			expect(game.turnstate!.playedShipCards.length).toBe(1);		
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

		player.move(ship1, "hand", "sr,0,0");
		player.move(pony, "hand", "p,1,0");

		player.move(ship2, "hand", "sr,1,0");
		player.move(changeling, "hand", "p,2,0");
		player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");

		player.move(lovePoison, "hand", "sd,1,0");
		player.move(changeling, "p,2,0", "p,1,1");
		player.setEffect(changeling, "disguise", "Core.Pony.StarswirlTheBearded");

		expectGoalAchieved(game, goal);
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

		player.move(ship1, "hand", "sr,0,0");
		player.move(pony1, "hand", "p,1,0");
		player.move(ship2, "hand", "sr,1,0");
		player.move(pony2, "hand", "p,2,0");

		player.move(pony1, "p,1,0", "offset,1,0");
		player.move(changeling, "hand", "p,1,0");

		expect(game.turnstate!.brokenShips.length).toBe(2);
		hasShipPair(game.turnstate!.brokenShips, start, pony1)
		hasShipPair(game.turnstate!.brokenShips, pony2, pony1)

		player.setEffect(changeling, "disguise", "Core.Pony.VinylScratch");

		expect(game.turnstate!.brokenShips.length).toBe(2);
		hasShipPair(game.turnstate!.brokenShips, start, pony1)
		hasShipPair(game.turnstate!.brokenShips, pony2, pony1)


		expect(game.turnstate!.playedShips.length).toBe(4);
		hasShipPair(game.turnstate!.playedShips, pony1, start)
		hasShipPair(game.turnstate!.playedShips, pony1, pony2)
		hasShipPair(game.turnstate!.playedShips, start, changeling+":1")
		hasShipPair(game.turnstate!.playedShips, pony2, changeling+":1")
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

		player.move(ship1, "hand", "sr,0,0");
		player.move(pony1, "hand", "p,1,0");

		player.setEffect(pony1, "gender", "male");

		player.move(ship2, "hand", "sd,1,0");
		player.move(pony2, "hand", "p,1,1");
		player.setEffect(pony2, "gender", "female");

		expectGoalAchieved(game, goal);
	});

	test("PlayLovePoisons", () => {

		let [game, player] = setupGame();
		let goal = "Core.Goal.Epidemic";
		player.drawGoal(goal);

		let pony = "Core.Pony.DramaticallyWoundedRarity";
		let lovePoison1 = "Core.Ship.LovePoisonIsNoJoke";
		let lovePoison2 = "Core.Ship.ShmoopyBoo";

		player.grab(pony, lovePoison1, lovePoison2);

		player.move(lovePoison1, "hand", "sr,0,0");
		player.move(pony, "hand", "p,1,0");

		expectGoalUnachieved(game, goal);

		player.move(lovePoison2, "hand", "sd,0,0");
		player.move(pony, "p,1,0", "p,0,1");


		expectGoalAchieved(game, goal);
	});

	test("PlayPonies takes into account card.count property", () =>{

		let [game, player] = setupGame();
		let goal = "Core.Goal.QueenPlatinumsCourt";
		player.drawGoal(goal);

		let ship1 = "Core.Ship.CanITellYouASecret";
		let ship2 = "Core.Ship.DudeLooksLikeALady";
		let flimFlam = "Core.Pony.Flim&Flam";
		let unicorn = "Core.Pony.HeartlessDictatorRarity";
		player.grab(ship1, ship2, flimFlam, unicorn);

		player.move(ship1, "hand", "sr,0,0");
		player.move(unicorn, "hand", "p,1,0");

		expectGoalUnachieved(game, goal);

		player.move(ship1, "hand", "sr,1,0");
		player.move(flimFlam, "hand", "p,2,0");

		expectGoalAchieved(game, goal);
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

		player.move(ship1, "hand", "sr,0,0");
		player.move(bigmac, "hand", "p,1,0");

		expectGoalUnachieved(game, goal);

		player.move(ship2, "hand", "sr,1,0");
		player.move(twi, "hand", "p,2,0");

		expectGoalAchieved(game, goal);
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

		player.move(ship1, "hand", "sr,0,0");
		player.move(bigmac, "hand", "p,1,0");

		player.move(ship2, "hand", "sr,1,0");
		player.move(twi, "hand", "p,2,0");

		expectGoalAchieved(game, goal);

		player.endTurn();

		expectGoalAchieved(game, goal);

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

		player.move(ship1, "hand", "sr,0,0");
		player.move(bigmac, "hand", "p,1,0");

		player.move(ship2, "hand", "sr,-1,0");
		player.move(changeling, "hand", "p,-1,0");

		expectGoalAchieved(game, goal);
		player.setEffect(changeling, "disguise", "Core.Pony.RoyalGuardShiningArmor");
		expectGoalAchieved(game, goal);

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

		player.move(ship1, "hand", "sr,0,0");
		player.move(male, "hand", "p,1,0");
		player.move(ship2, "hand", "sd,0,0");
		player.move(pixelPrism, "hand", "p,0,1");

		expect(evalGoalLogic(game, "ExistsShip(gender=male, gender=female, 2)")).toBe(false);

		player.setEffect(pixelPrism, "fullCopy", male);

		expect(evalGoalLogic(game, "ExistsShip(gender=male, gender=female, 2)")).toBe(true);
		expect(evalGoalLogic(game, "ExistsShip(gender=female, gender=female, 1)")).toBe(true);
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

		player.move(ship1, "hand", "sr,0,0");
		player.move(male, "hand", "p,1,0");
		player.move(ship2, "hand", "sd,0,0");
		player.move(pixelPrism, "hand", "p,0,1");

		expect(evalGoalLogic(game, "ExistsPony(race=earth, 2)")).toBe(false);
		expect(evalGoalLogic(game, "ExistsPony(race=unicorn, 2)")).toBe(true);

		player.setEffect(pixelPrism, "fullCopy", male);
		
		expect(evalGoalLogic(game, "ExistsPony(race=earth, 2)")).toBe(true);
		expect(evalGoalLogic(game, "ExistsPony(race=unicorn, 2)")).toBe(true);
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

		player.move(ship1, "hand", "sr,0,0");
		player.move(male, "hand", "p,1,0");
		player.move(ship2, "hand", "sd,0,0");
		player.move(pixelPrism, "hand", "p,0,1");

		player.setEffect(pixelPrism, "fullCopy", male);
		
		expect(evalGoalLogic(game, "ExistsShip(name=Twilight Sparkle, name=Big Macintosh, 2)")).toBe(true);
		expect(evalGoalLogic(game, "ExistsShip(name=Twilight Sparkle, name=Pixel Prism)")).toBe(true);
	});

	test("aloe/lotus ships count as two ships", () => {

		let [game, player] = setupGame();;

		let aloelotus = "Core.Pony.AloeAndLotus";
		let malePony = "Core.Pony.BigMacintosh";
		let femalePony = "Core.Pony.StarStudentTwilight";

		let ship1 = "Core.Ship.BadPonyGoToMyRoom";
		let ship2 = "Core.Ship.BoredOnASundayAfternoon";
		let ship3 = "Core.Ship.CheckingItOffMyList";

		player.grab(aloelotus, malePony, femalePony, ship1, ship2);

		player.move(ship1, "hand", "sr,0,0");
		player.move(malePony, "hand", "p,1,0");

		player.endTurn();
		expect(evalGoalLogic(game, "PlayShips(gender=male, gender=female, 2)")).toBe(false);

		player.move(ship2, "hand", "sr,1,0");
		player.move(aloelotus, "hand", "p,2,0");

		expect(evalGoalLogic(game, "PlayShips(gender=male, gender=female, 2)")).toBe(true);
	})

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