So, you want add your own cards + play shipfic with them online?
================================================================

Excellent, let's get down into how to do it.


Step 0: Have art for your shipfic cards
--------------------------------------

It goes without saying that if you want to add your own cards, you first need to have cards!

Check out the [TSSSF card generator](http://latent-logic.github.io/TSSSF-Frontend/) as well as the released card
assets from Horrible People. TSSSF.net uses 788x1088 .png images for all card art

Once you have your .png files ready, you'll need to upload them online. If you're only making a small number of shipfic
cards, uploading them to a 3rd party website like the [secret shipfic booru](https://secretshipfic.booru.org) or
[derpibooru](https://derpibooru.org/) is perfect. If you plan on making dozens of cards and releasing multiple expansion
packs, you chould check out [Appendix A: Pack Format](#appendix-a-pack-format) for a better way to organizing your packs


Step 1: Create a pack.json file
---------------------------------

All the metadata for each shipfic card is stored in a JSON file. JSON is a very common file format which you can edit
easily in a free text editor like notepad++.


The pack.json file doesn't need to be named pack.json, but it does need to have the following structure:


	{
		"name": "My Shipfic Cards",
		"format": "link:1",
		"namespace": "authorName.packName",
		
		"cards": {
			"pony": {
				// add any pony cards here
			},

			"ship": {
				// add any ship cards here
			},

			"goal": {
				// add any goal cards here
			},

			"start": {
				// add any start cards here
			}
		}
	}


Here, the name attribute is what you want to display as the name of your pack, and the namespace attribute is a unique
name associated with your pack (it's standard to do authorName.packName, but you can use anything as long as it only
uses A-z characters and periods)

Replace the <code>// add</code> comments with additional JSON to add your cards to the pack, like so. Make sure to
replace the names with ones that fit and the URLS with URLs that point to your uploaded cards

	{
		"name": "My Shipfic Cards",
		"format": "link:1",
		"namespace": "authorName.packName",
		
		"cards": {
			"pony": {
				"BrokenWingRainbowDash": {
					"url": "https://tsssf.net/packs/Core/Pony/BrokenWingRainbowDash.png"
				},
				"UnicornChangeling": {
					"url": "https://tsssf.net/packs/Core/Pony/UnicornChangeling.png"
				}
			},

			"ship": {
				"LovePoisonIsNoJoke": {
					"url": "https://tsssf.net/packs/Core/Ship/LovePoisonIsNoJoke.png"
				}
			},

			"goal": {
				"ItsNotEvil": {
					"url": "https://tsssf.net/packs/Core/Goal/ItsNotEvil.png"
				}
			},

			"start": {
				"FanficAuthorTwilight": {
					"url": "https://tsssf.net/packs/Core/Start/FanficAuthorTwilight.png"
				}
			}
		}
	}


Step 2: Add Additional Attributes to Each Card
-----------------------------------------------

Now that every card has an image associated with it, it's time to add additional attributes specific to whether it's a
pony card, a ship card, or a goal card.

There's many, many more attributes used by TSSSF.net across all the cards, but the above example should be enough to get
you started. See [Appendix B: Pony, Ship, + Goal attributes](#appendix-b-pony-ship-goal-attributes) for a complete list,
or check out the core deck's [pack.json](/packs/Core/pack.json)file for even more examples. 

	{
		"name": "My Shipfic Cards",
		"format": "link:1",
		"namespace": "authorName.packName",
		
		"cards": {
			"pony": {
				"BrokenWingRainbowDash": {
					"url": "https://tsssf.net/packs/Core/Pony/BrokenWingRainbowDash.png",
					"name": "Rainbow Dash",
					"race": "pegasus",
					"gender": "female",
					"action": "replace",
					"keywords": [
						"Mane 6"
					]
				},
				"UnicornChangeling": {
					"url": "https://tsssf.net/packs/Core/Pony/UnicornChangeling.png",
					"name": "Changeling",
					"race": "unicorn",
					"action": "Changeling(unicorn)",
					"keywords": [
						"Changeling",
						"Villain"
					]
				}
			},

			"ship": {
				"LovePoisonIsNoJoke": {
					"url": "https://tsssf.net/packs/Core/Ship/LovePoisonIsNoJoke.png",
					"action": "lovePoison"
				}
			},

			"goal": {
				"ItsNotEvil": {
					"url": "https://tsssf.net/packs/Core/Goal/ItsNotEvil.png",
					"points": "1"
				}
			},

			"start": {
				"FanficAuthorTwilight": {
					"url": "https://tsssf.net/packs/Core/Start/FanficAuthorTwilight.png",
					"name": "Twilight Sparkle",
					"race": "unicorn",
					"gender": "female",
					"keywords": [
						"Mane 6"
					]
				}
			}
		}
	}


Step 3: Upload to TSSSF.net
----------------------------

Now that you have your json file ready to go, it's time to upload it! Host a new game, open the 'Choose Cards' tab, and
upload your JSON file.

If you've done everything correctly, you should now see your cards on the page and you can now play shipfic with them!

<div><img src="./addYourOwnCards/upload2.png" /></div>


Appendix A: Pack Format
-----------------------

The link:1 format, described above, is a good way to quickly put together a pack of cards to play online. However, for
larger collections of cards it is convenient to store all the cards in the same folder structure, rather than linking
individual cards together. Hence, the pack:1 format.

### The Pack:1 File Structure ###

The difference between the pack:1 format and the link:1 format is that the pack:1 format omits the url attributes and
instead, stores the images files in a consistent location based on the card's key name, card type, namespace, and a root
attribute, e.g.

<div class='inset'>
	<span class='text-root'>root</span>/<span class='text-namespace'>namespace</span>/<span class="text-cardtype">cardType</span>/<span class="text-cardkey">cardKey</span>.png
</div>

For example, the following pack.json file

	{
		"name": "My Shipfic Cards",
		"format": "pack:1",
		"namespace": "authorName.packName",
		"root": "https://tsssf.net/packs",
		
		"cards": {
			"pony": {
				"BrokenWingRainbowDash": {
					"name": "Rainbow Dash",
					"race": "pegasus",
					"gender": "female",
					"action": "replace",
					"keywords": [
						"Mane 6"
					]
				}
			},

			"ship": {
				"LovePoisonIsNoJoke": {
					"action": "lovePoison"
				}
			},

			"goal": {
				"ItsNotEvil": {
					"points": "1"
				}
			},

			"start": {
				"FanficAuthorTwilight": {
					"name": "Twilight Sparkle",
					"race": "unicorn",
					"gender": "female",
					"keywords": [
						"Mane 6"
					]
				}
			}
		}
	}


corresponds to image files uploaded to the following paths:

<div class='inset'>
	<span class='text-root'>https://tsssf.net/packs</span>/<span class='text-namespace'>authorName/packName</span>/<span class="text-cardtype">Pony</span>/<span class="text-cardkey">BrokenWingRainbowDash</span>.png<br>
	<span class='text-root'>https://tsssf.net/packs</span>/<span class='text-namespace'>authorName/packName</span>/<span class="text-cardtype">Ship</span>/<span class="text-cardkey">LovePoisonIsNoJoke</span>.png<br>
	<span class='text-root'>https://tsssf.net/packs</span>/<span class='text-namespace'>authorName/packName</span>/<span class="text-cardtype">Goal</span>/<span class="text-cardkey">ItsNotEvil</span>.png<br>
	<span class='text-root'>https://tsssf.net/packs</span>/<span class='text-namespace'>authorName/packName</span>/<span class="text-cardtype">Start</span>/<span class="text-cardkey">FanficAuthorTwilight</span>.png
</div>

Note that periods in the namespace attribute correspond to nested folders in the path name.

### Thumbnail Images ###

In addition to the above file structure, every .png image has a corresponding thumbnail image, suffixed with .thumb.jpg.

<div class='inset'>
	<span class='text-root'>https://tsssf.net/packs</span>/<span class='text-namespace'>authorName/packName</span>/<span class="text-cardtype">Pony</span>/<span class="text-cardkey">BrokenWingRainbowDash</span>.png<br>
	<span class='text-root'>https://tsssf.net/packs</span>/<span class='text-namespace'>authorName/packName</span>/<span class="text-cardtype">Pony</span>/<span class="text-cardkey">BrokenWingRainbowDash</span>.thumb.jpg
</div>

The .thumb.jpg images are only 197 x 272 pixels and are much smaller than their .png counterparts, making them load much
more quickly.


Appendix B: Pony, Ship, + Goal Attributes
------------------------------------------

For examples of cards which use the attributes explained in this section, see the various pack.json files used by
tsssf.net.

<div class='inset'>
	<div><a href="/packs/Core/pack.json">Core/pack.json</a></div>
	<div><a href="/packs/EC/pack.json">EC/pack.json</a></div>
	<div><a href="/packs/PU/pack.json">PU/pack.json</a></div>
	<div><a href="/packs/NoHoldsBarred/pack.json">NoHoldsBarred/pack.json</a></div>
</div>

### Pony Attributes ###

<div class='figure'>
	<table>
		<tr>
			<th>Attribute</th><th>Valid Values</th><th>Notes/Description</th>
		</tr>
		<tr>
			<td>name</td><td>Any string, required<br>"name1/name2/..."</td><td>Should be the simplest name of the pony in question, e.g. Twilight Sparkle for cards like Fanfic Author Twilight</td>
		</tr>
		<tr class='alt'><td rowspan="5">race</td><td>"earth"</td><td></td></tr>
		<tr class='alt'><td>"pegasus"</td><td></td></tr>
		<tr class='alt'><td>"unicorn"</td><td></td></tr>
		<tr class='alt'><td>"alicorn"</td><td></td></tr>
		<tr class='alt'><td>"race1/race2/..."</td><td>Any combination of the above races separated by a slash. Will count as each of those races.</td></tr>
		<tr><td rowspan="3">gender</td><td>"male"</td></tr>
		<tr><td>"female"</td></tr>
		<tr><td>"male/female"</td><td>Counts as both male and female for all goals</td></tr>
		<tr class='alt'><td>keywords</td><td>Any string array</td><td>Contains all non-name keywords for the pony</td></tr>
		<tr><td>altTimeline</td><td>true</td><td>Gives a card the altTimeline/apocalypse/hour glass symbol</td></tr>
		<tr class='alt'><td>changeGoalPointValues</td><td>true</td><td>When this card is on the grid, prevents goal cards from being worth their normal amount of points</td></tr>
		<tr><td>count</td><td>any number</td><td>Changes how many ponies this card counts as, e.g. 2 for Aloe & Lotus</td></tr>
		<tr class='alt'><td rowspan="16">action</td><td>"swap"</td><td></td></tr>
		<tr class='alt'><td>"3swap"</td><td></td></tr>
		<tr class='alt'><td>"replace"</td><td></td></tr>
		<tr class='alt'><td>"search"</td><td></td></tr>
		<tr class='alt'><td>"copy"</td><td></td></tr>
		<tr class='alt'><td>"fullCopy"</td><td>Copies a card's power as well as all its symbols, names, keywords, etc.</td></tr>
		<tr class='alt'><td>"draw"</td><td></td></tr>
		<tr class='alt'><td>"newGoal"</td><td></td></tr>
		<tr class='alt'><td>"playFromDiscard"</td><td></td></tr>
		<tr class='alt'><td>"interrupt"</td><td>Allows the card to a pony card which was just played, even if it's not that player's turn.</td></tr>
		<tr class='alt'><td>"ship"</td><td>Allows the pony card to be played as a ship as well</td></tr>
		<tr class='alt'><td>"shipWithEverypony"</td><td>Special ability for HorriblePeople.GraciousGivers.Pony.PrincessCelestAI</td></tr>
		<tr class='alt'><td>"Changeling(&lt;type&gt;)"</td><td>Allows the card to set a disguise when played and when moved. &lt;type&gt; can be any of the following:
		<div class='inset'>
			earth<br>
			pegasus<br>
			unicorn<br>
			alicorn<br>
			nonAlicornFemale<br>
			plushling<br>
			replace
		</div>
		</td></tr>
		<tr class='alt'>
			<td>"ChangelingNoRedisguise(&lt;type&gt;)"</td>
			<td>Same as Changeling(&lt;type&gt;), but the card cannot redisguise when moved</td>
		</tr>
		<tr class='alt'>
			<td>"exchangeCardsBetweenHands"</td><td>Causes players to randomly trade one card with the player next to them</td>
		</tr>
		<tr class='alt'><td>"Reminder(&lt;message&gt;)"</td><td>Adds a checkbox to remind the player to do something before the end of their turn. &lt;message&gt; is the text that's displayed next to the checkbox</td></tr>
	</table>
</div>

### Ship Attributes ###

<div class='figure'>
	<table>
		<tr>
			<th>Attribute</th><th>Valid Values</th><th>Notes/Description</th>
		</tr>
		<tr><td rowspan=10>action</td><td>"genderChange"</td><td></td></tr>
		<tr><td>"raceChange"</td><td></td></tr>
		<tr><td>"timelineChange"</td><td></td></tr>
		<tr><td>"lovePoison"</td><td></td></tr>
		<tr><td>"makePrincess"</td><td></td></tr>
		<tr><td>"keywordChange"</td><td></td></tr>
		<tr><td>"clone"</td><td></td></tr>
		<tr>
			<td>"addKeywords(&lt;list&gt;)"</td>
			<td>&lt;list&gt; is a list of keywords (no quotation marks) separated by commas, e.g. <br>Object<br>Nightmare, Villain</td>
		</tr>
		<tr><td>"raceGenderChange"</td><td></td></tr>
		<tr><td>"keywordChange"</td><td></td></tr>
	</table>
</div>

### Goal Attributes ###

<table>
	<tr>
		<th>Attribute</th><th>Valid Values</th><th>Notes/Description</th>
	</tr>
	<tr><td rowspan=2>points</td><td>any number in quotes, e.g. "3", "-1", "0.5"</td><td></td></tr>
	<tr>
		<td>multiple numbers (which follow the above rules) separated by a slash in quotes e.g."3/4"</td>
		<td>Used for cards which can be worth different point values, depending on certain criteria</td>
	</tr>
	<tr class='alt'><td>goalLogic</td><td>See <a href="#appendix-c-goal-logic">Appendix C: Goal Logic</a></td><td></td>
</table>


Appendix C: Goal Logic
--------------------------------

Goal logic is an attribute on goal cards which specifies the criteria needed to achieve a goal. Because there are many
different kinds of goals and criteria, goal logic is expressed in its own language and has its own specific syntax. To
give you an idea to what the language looks like, here are a few examples of the text written on various goal cards and
the goal logic associated with it.

<table>
	<tr><th>Card Text</th><th>Goal Logic</th></tr>
	<tr><td>Win this goal when 6 earth pony/earth pony ships are on the grid</td><td><code>ExistsShip(race=earth,race=earth,6)</code></td></tr>
	<tr class='alt'><td>Win this goal when at least 5 time travelers are on the grid</td><td><code>ExistsPony(altTimeline=true, 5)</code></td></tr>
	<tr><td>Win this Goal when Rainbow Dash is shipped with any 3 females</td><td><code>ExistsPonyShippedTo(name=Rainbow Dash, Select(gender=female,3))</code></td></tr>
	<tr class='alt'><td>Win this goal when 6 ponies with the Mane 6 keyword are shipped in a chain</td><td><code>ExistsChain(Mane 6 in keywords, 6)</code></td></tr>
	<tr><td>Win this goal when you break up Shining Armor with any female except Twilight Sparkle</td><td><code>BreakShip(name=Shining Armor, gender=female && name != Twilight Sparkle)</code></td></tr>
</table> 

### Goal functions ###

Valid goal logic consists of a single goal function with all its criteria/count parameters passed in to it. Each goal
function checks something different, so make sure you use the right one for your goal

<div class='figure'>
	<div class='function-doc'>
		<div>ExistsPony</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>ExistsPony(&lt;criterion&gt;)</code><br>
				<code>ExistsPony(&lt;criterion&gt;, &lt;count&gt;)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a pony matching criterion is on the grid. If count is provided, checks that there are &lt;count&gt; distinct ponies which match the criterion</div>
		</div>
	</div>
	<div class='function-doc alt'>
		<div>ExistsShip</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>ExistsShip(&lt;criterion1&gt;, &lt;criterion2&gt;)</code><br>
				<code>ExistsShip(&lt;criterion1&gt;, &lt;criterion2&gt;, &lt;count&gt;)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a pony matching criterion1 is shipped with a pony matching criterion2. If count is provided, checks that there are &lt;count&gt; distinct ships which match the criteria</div>
		</div>
	</div>
	<div class='function-doc'>
		<div>ExistsPonyShippedTo</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>ExistsPonyShippedTo(&lt;criterion1&gt;, Select(&lt;criterion2&gt;, &lt;count&gt;))</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a pony matching criterion1 is shipped with count other ponies, each of which match criterion2</div>
		</div>
		<div style="height: 20px"></div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>ExistsPonyShippedTo(&lt;criterion1&gt;, AllOf(&lt;criterion2&gt;, &lt;criterion3&gt;, ...))</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a pony matching criterion1 is shipped with several ponies, each of which matches a different criterion specified in AllOf. AllOf takes in any number of criterion parameters, each separated by a comma</div>
		</div>
		<div style="height: 20px"></div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>ExistsPonyShippedTo(&lt;criterion&gt;, ShippedWith2Versions)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a pony matching the criterion is shipped with two different versions of a pony</div>
		</div>
	</div>
	<div class='function-doc alt'>
		<div>ExistsChain</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>ExistsChain(&lt;criterion&gt;, &lt;count&gt;)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a chain of size count exists on the grid, where each pony in the chain matches the specified criterion.</div>
		</div>
	</div>
	<div class='function-doc'>
		<div>PlayPonies</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>PlayPonies(&lt;criterion&gt;, &lt;count&gt;)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a player has played count ponies this turn where the pony matches the specified criterion.</div>
		</div>
	</div>
	<div class='function-doc alt'>
		<div>PlayShips</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>PlayShips(&lt;criterion1&gt;, &lt;criterion2&gt;, &lt;count&gt;)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a player has played count ships this turn where one of the two ponies matches criterion1 and the other matches criterion2</div>
		</div>
	</div>
	<div class='function-doc'>
		<div>PlayShipCards</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>PlayShipCards(&lt;criterion&gt;)</code><br>
				<code>PlayShipCards(&lt;criterion&gt;, &lt;count&gt;)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a player has played a certain number of ship cards (as opposed to ships) matching the criteria this turn. </div>
		</div>
	</div>
	<div class='function-doc alt'>
		<div>BreakShip</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>BreakShip(&lt;criterion1&gt;, &lt;criterion2&gt;)</code><br>
				<code>BreakShip(&lt;criterion1&gt;, &lt;criterion2&gt;, &lt;count&gt;)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks for whether a player has broken a ship this turn where one of the ponies matches criterion1 and the other criterion2. If count is provided, checks that such a ship has been broken count times this turn (it can be the same ship multiple times, or several different ships)</div>
		</div>	
	</div>
	<div class='function-doc'>
		<div>SwapCount</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>SwapCount(&lt;count&gt;)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks whether at least count different cards have been swapped this turn.</div>
		</div>
	</div>
</div>

There's a few other niche goal functions, but they exist primarily for special cards

<div class='figure'>
	<div class='function-doc'>
		<div>ExistsShipGeneric</div>
		<div class='inset hangingIndent'>
			<div>Syntax:&nbsp;</div>
			<div>
				<code>ExistsShipGeneric(ShippedWithOppositeGenderedSelf)</code>
			</div>
		</div>
		<div class='inset hangingIndent'>
			<div>Use:&nbsp;</div>
			<div>Checks whether any ship exists between a pony and a gender-swapped version of the same pony.</div>
		</div>
	</div>
</div>

<!--
<div class='function-doc'>
	<div>funName</div>
	<div class='inset hangingIndent'>
		<div>Syntax:&nbsp;</div>
		<div>
			<code>myCode</code>
		</div>
	</div>
	<div class='inset hangingIndent'>
		<div>Use:&nbsp;</div>
		<div></div>
	</div>
	
</div>
-->



### Criteria ###

Criteria are what actually determine if a particular pony card matches or not based on the
[pony card's attributes](#appendix-b-pony-ship-goal-attributes). They are passed in as parameters to goal functions

<div class='figure'>
	<table>
		<tr><td><code>&lt;attribute&gt; = &lt;value&gt;</code></td><td>Matches when the card has attribute set to value</td></tr>
		<tr><td><code>&lt;attribute&gt; != &lt;value&gt;</code></td><td>Matches when the card does NOT have attribute set to value</td></tr>
		<tr><td><code>&lt;value&gt; in keywords</code></td><td>Matches when the card has value in its keywords</td></tr>
		<tr><td><code>&lt;value&gt; !in keywords</code></td><td>Matches when the card does NOT have value in its keywords</td></tr>
		<tr><td><code>genderSwapped</code></td><td>Matches cards which have had their gender swapped</td></tr>
		<tr><td><code>*</code></td><td>Matches every card</td></tr>
	</table>
</div>

Criteria do not use quotation marks anywhere for simplicity's sake. Whitespace between operators like = and != is not
necessary, though may help readability. For names which contain two or more words, the whitespace in the name will not
be removed, but the whitespace before and after the name will. Names and attributes are cAsE sEnSiTiVe

You can combine multiple criteria into a single check with the following criteria

<div class='figure'>
	<table>
		<tr><td><code>&lt;criterion1&gt; || &lt;criterion2&gt;</code></td><td>Matches when the card matches criterion1, criterion2, or both</td></tr>
		<tr><td><code>&lt;criterion1&gt; && &lt;criterion2&gt;</code></td><td>Matches when the card matches both criterion1 and criterion2</td></tr>
	</table>
</div>

During the game, cards can sometimes change genders, change races, or gain new keywords. Thus, it is sometimes helpful
for criteria to test what the card's original attributes were, rather than what they are now. This can be accommodated
by adding "\_b" (b for base) to an attribute's name. Here's an example for a criterion which uses this to test if a card
has been changed into an alicorn

<div class='figure' style="text-align: center;"><code>race=alicorn && race_b != alicorn</code></div>

<script>hljs.highlightAll();</script>

