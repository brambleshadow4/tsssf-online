import fs from "fs";

/* This snippit is usefule for building out the table of contents

var doc = document.getElementById('main')
var toc = [];

for(var i=0; i<doc.children.length; i++)
{
	let child = doc.children[i];
	console.log(child)

	if(child.tagName == "H1")
	{
		let entry = `<div class='level1'><a href="#${child.id || child.getAttribute('idf')}">${child.innerHTML}</a></div>`;
		toc.push(entry)
	}
	if(child.tagName == "H2")
	{
		let entry = `<div class='level2'><a href="#${child.id || child.getAttribute('idf')}">${child.innerHTML}</a></div>`;
		toc.push(entry)
	}
	if(child.tagName == "H3")
	{
		let entry = `<div class='level3'><a href="#${child.id || child.getAttribute('idf')}">${child.innerHTML}</a></div>`;
		toc.push(entry)
	}
}

console.log(toc.join("\n"))

*/


export function buildTemplate(filename, navTemplate, outFileName)
{
	var rawTxt = fs.readFileSync(filename, {encoding: "utf8"});
	var outFileName = (outFileName || filename).replace(".md", ".html");
	var html = toHTML(rawTxt);


	var bonusStyle = `
		<style>
		body
		{
			background-image: url(/img/tileBackground2.jpg);
			background-size: 40%;
		}

		.main
		{
			border: solid 2px black;
			background-color: white;
			margin-top: 40px;
		}
		nav {display: block}
		</style>
	`

	var fullPage = `
	<!DOCTYPE html>
	<html>
		<head>
			<meta encoding='utf-8' />
			<title>Twilight Sparkle's Secret Shipfic Folder Online</title>

			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<meta name="twitter:card" content="summary" />
			<meta property="og:title" content="Twilight Sparkle's Secret Shipfic Folder Online">
			<meta property="og:description" content="Play and host TSSSF games through the magic of the internet">
			<meta property="og:image" content="http://tsssf.net/img/tsssf-box.png">
			<meta property="og:url" content="http://www.tsssf.net">
			<meta property="og:type" content="website">

			<link href="/info/style.css" type="text/css" rel="stylesheet"/>
			<link href="/info/highlight.min.css" type="text/css" rel="stylesheet" />

			<script src="/sectionLinks.js"></script>
			<script src="/info/highlight.min.js"></script>

			<script>
				function inIframe () {
					try {
						return window.self !== window.top;
					} catch (e) {
						return true;
					}
				}
				if(!inIframe())
				{
					document.head.innerHTML += \`${bonusStyle}\`
				}
			</script>

		</head>
		<body>
			<nav>
				<a href="/">TSSSF.net</a>
				${navTemplate}
			</nav>
			<div id='main' class='main'>
				${html}
			</div>
			<script>
				if(inIframe())
				{
					let thispage = window.location + "".split("#")[0];
					let links = document.getElementsByTagName('a');
					for(let i=0; i < links.length; i++)
					{
						if(!links[i].href.startsWith(thispage))
						{
							links[i].setAttribute("target", "_blank");
						}
					}
				}
			</script>
		</body>
	</html>`;


	fs.writeFileSync(outFileName, fullPage);
}



/*
 * Element has three attributes
 *   type:
 *   lines:
 *   id: 
 */

/**
 * Block elements to worry about
 *	headers
 *	Lists  -lazy
 *	blockquotes -lazy
 *	code blocks
 *	horizontal rules
 */


export function toHTML(markdown)
{
	var hyperlinks = {};

	var urlDefPattern = /\[([A-Za-z0-9_.,;: ]+)\]: ?(.+?)(\r\n|\n|\r|$)/;
	var link1 = urlDefPattern.exec(markdown);
	while(link1)
	{
		hyperlinks[link1[1]] = link1[2].trim();

		markdown = markdown.replace(link1[0], "")
		link1 = urlDefPattern.exec(markdown);
	}


	var Fmt = {};
	Fmt.Blockquote = /^> ?/;
	Fmt.HashHeading = /^#{1,6} /;
	Fmt.Bullets = /^ ? ? ?[*+-] /;
	Fmt.Ordered = /^ *\d+\. +/;
	Fmt.Code = /^	/;
	Fmt.Hr = /^\s*\*\s*\*(\s*\*)+|^\s*-\s*-(\s*-)+/;
	Fmt.UnderlineHeading = /^---+|^===+/;
	Fmt.HTML = /^<([a-zA-Z0-9]+)(\s*\w+\s*=\s*('([^'\\]|\\.)*'|"([^"\\]|\\.)*"))*\s*\/?>/

	// margin
	// identifier
	//   par
	//   break
	//   blockquote
	//   bullet
	//   number

	//steps
	// parse link definitions
	// parse block elements
	// parse inline elements
	var lines = markdown.replace(/\t/g,"	").split(/\r\n|\n|\r/);

	return processBlocks({type:"", lines: lines});

	function textToId(text)
	{	
		return (
			text.toLowerCase()
			.replace(/[^a-z0-9- ]/g,"")
			.replace(/-/g, " ")
			.replace(/ +/g," ")
			.trim()
			.replace(/ /g, "-")
		)

	}

	function processBlocks(element)
	{

		var margin = 0;
		var lines = element.lines;
		var contextLines = [];
		var blocks = [];

		//these are used if element is a list to determine if it should wrap items in <p> tags
		var isSingleParagraph = true;
		var inParagraph = false;
		var pCount = 0;

		while(lines.length)
		{
			var contextLine = {line: lines.shift(), indent: 0};

			var HTMLmatch = Fmt.HTML.exec(contextLine.line);
			if(HTMLmatch)
			{
				var inlineTags = ["b", "big", "i", "small", "tt", "abbr", "acronym", "cite",
					"code", "dfn", "em", "kbd", "strong", "samp", "var", "a", "bdo", "br", "img",
					"map", "object", "q", "span", "sub", "sup", "button", "input", "label",
					 "select", "textarea"];
				if(inlineTags.indexOf(HTMLmatch[1]) == -1)
				{
					if(HTMLmatch[0][HTMLmatch[0].length-2] == "/" || contextLine.line.indexOf("</"+HTMLmatch[1]+">") != -1)
					{
						contextLine.type = "HTML";
						inParagraph = false;
						contextLines.push(contextLine);

						continue;
					}
					else
					{
						var count = -1;
						var nestedLevel = 0;
						for(var i=0; i<lines.length; i++)
						{
							if(lines[i].startsWith("</"+HTMLmatch[1]+">"))
							{
								count = i;
								break;
							}
						}

						if(count != -1)
						{
							inParagraph = false;
							contextLine.type = "HTML";
							contextLines.push(contextLine);

							for(var i=0; i<=count; i++)
							{
								var contextLine = {line: lines.shift(), indent: 0};
								contextLine.type = "HTML";
								contextLines.push(contextLine);
							}

							continue;
						}
					}
				}
			}

			if(contextLine.line.trim() == "")
			{
				contextLine.type = "Break";
				inParagraph = false;

			}
			else if(Fmt.HashHeading.exec(contextLine.line))
			{
				contextLine.type = "Hash";
				//isSingleParagraph = false;
			}
			else if(Fmt.Hr.exec(contextLine.line))
			{
				contextLine.type = "Hr"
				while(contextLine.line[contextLine.indent] == " ")
					contextLine.indent++;

				//isSingleParagraph = false;
			}
			else if(Fmt.Blockquote.exec(contextLine.line))
			{
				contextLine.type = "Quote";

				//isSingleParagraph = false;
			}
			else if(Fmt.Bullets.exec(contextLine.line))
			{
				contextLine.type = "Bullet";
				contextLine.line = contextLine.line.replace(/\+|-/, "*");
				contextLine.inner = contextLine.line.indexOf("*") + 1;
				while(contextLine.line[contextLine.inner] == " ")
					contextLine.inner++;

				//isSingleParagraph = false;
			}
			else if(Fmt.Ordered.exec(contextLine.line))
			{
				contextLine.type = "Number";
				contextLine.inner = contextLine.line.indexOf('.') + 2;

				//isSingleParagraph = false;
			}

			else if(lines.length && Fmt.UnderlineHeading.exec(lines[0]))
			{
				contextLine.type = "Heading";
				contextLines.push(contextLine);
				contextLine = {type:"Heading", line: lines.shift(), indent:0};

				//isSingleParagraph = false;
			}
			else
			{
				if(!inParagraph)
					pCount++;

				inParagraph = true;
				contextLine.type = "Par";
			}

			while(contextLine.line[contextLine.indent] == " ")
				contextLine.indent++;

			contextLines.push(contextLine);
		}

		//group lines into appropriate HTML elements + process each element
		while(contextLines.length)
		{
			if(contextLines[0].type == "Break")
			{
				contextLines.shift();
			}
			else if(contextLines[0].type == "HTML")
			{
				var code = "";
				while(contextLines.length && contextLines[0].type == "HTML")
				{
					code += contextLines.shift().line + "\r\n";
				}

				blocks.push(code);

			}
			else if(contextLines[0].indent >= 4)
			{
				var preCode = "<pre><code>";

				preCode += contextLines.shift().line.substring(4);

				while(contextLines.length && (contextLines[0].type == "Break" || contextLines[0].indent >= 4))
				{
					preCode += "\r\n" + contextLines.shift().line.substring(4);
				}

				preCode += "</code></pre>";

				blocks.push(preCode);
			}
			else if(contextLines[0].type == "Par")
			{
				var paragraph = {type:"p", lines: []};

				if(element.type=="li" && pCount == 1 && isSingleParagraph)
					paragraph.type = "";

				while(contextLines.length && contextLines[0].type == "Par" && contextLines[0].indent < 4)
				{
					var line = contextLines.shift().line;
					line = line.replace(/  $/, "<br>");
					paragraph.lines.push(line);
				}

				blocks.push(processInline(paragraph));
			}
			else if(contextLines[0].type == "Heading")
			{
				var line1 = contextLines.shift().line;
				var line2 = contextLines.shift().line;

				var heading = {lines:[line1]};

				if(line2[0] == "=")
					heading.type = "h1";
				else
					heading.type = "h2";


				heading.id = textToId(line1);

				blocks.push(processInline(heading));
			}
			else if(contextLines[0].type == "Hash")
			{
				var line = contextLines.shift().line;
				var pattern = /^#{1,6} (.*?)#* *$/.exec(line)[1];


				var heading = {lines: [/^#{1,6} (.*?)#* *$/.exec(line)[1]]}


				var count = 0;
				while(line[count] == "#")
					count++;
				heading.type = "h"+count;
				heading.id = textToId(heading.lines[0]);;

				blocks.push(processInline(heading));
			}
			else if(contextLines[0].type == "Hr")
			{
				blocks.push("<hr>");
				contextLines.shift();
			}
			else if(contextLines[0].type == "Quote")
			{

				var blockquote = {type: "blockquote", lines:[]};
				var lastTokenBreak = false;
				while(contextLines.length &&
					(contextLines[0].type == "Quote" || contextLines[0].type == "Break" || (!lastTokenBreak && contextLines[0].type == "Par")))
				{
					if(contextLines[0].type == "Quote")
					{
						blockquote.lines.push(contextLines[0].line.substring(2));
						lastTokenBreak = false;
					}
					else if(contextLines[0].type == "Break")
					{
						lastTokenBreak = true;
						blockquote.lines.push(contextLines[0].line);
					}
					else
					{
						blockquote.lines.push(contextLines[0].line);
					}

					contextLines.shift();
				}

				blocks.push(processBlocks(blockquote));
			}
			else if(contextLines[0].type == "Bullet" || contextLines[0].type == "Number")
			{
				var listType = contextLines[0].type
				var ul = (listType == "Bullet" ? "<ul>" : "<ol>");

				var lastTokenBreak = false;

				while(contextLines.length && contextLines[0].type == listType)
				{
					var li = {type: "li", lines:[]};
					var line = contextLines.shift();

					var inner = line.inner;
					li.lines.push(line.line.substring(inner));

					while(contextLines.length && (contextLines[0].type == "Break"
						|| (!lastTokenBreak && contextLines[0].type == "Par")
						|| contextLines[0].indent >= inner
					))
					{
						if(contextLines[0].type == "Break")
						{
							lastTokenBreak = true;
						}

						if(contextLines[0].type == "Par" && contextLines[0].indent < inner)
							li.lines.push(contextLines[0].line.substring(contextLines[0].indent));
						else
							li.lines.push(contextLines[0].line.substring(inner));

						contextLines.shift();
					}

					ul += processBlocks(li);
				}

				ul += (listType == "Bullet" ? "</ul>" : "</ol>");

				blocks.push(ul);
			}
			else
			{
				contextLines.shift();
			}
		}

		if(element.type == "")
			return blocks.join("");

		var id = (element.id ? ` id="${element.id}"` : "")

		return `<${element.type}${id}>${blocks.join("")}</${element.type}>`;

	}

	// takes the lines of the element, processes them, wraps them up in the HTML tag,
	// and returns the complete HTML for the element
	function processInline(element)
	{
		var text = element.lines.join("\r\n");

		var escapes = {};
		escapes["\\\\"] = "\uE000\uE014\uE402";
		escapes["\\`"] = "\uE001\uE014\uE402";
		escapes["\\*"] = "\uE002\uE014\uE402";
		escapes["\\_"] = "\uE003\uE014\uE402";
		escapes["\\{"] = "\uE004\uE014\uE402";
		escapes["\\}"] = "\uE005\uE014\uE402";
		escapes["\\("] = "\uE006\uE014\uE402";
		escapes["\\)"] = "\uE007\uE014\uE402";
		escapes["\\["] = "\uE008\uE014\uE402";
		escapes["\\]"] = "\uE009\uE014\uE402";
		escapes["\\#"] = "\uE00A\uE014\uE402";
		escapes["\\+"] = "\uE00B\uE014\uE402";
		escapes["\\-"] = "\uE00C\uE014\uE402";
		escapes["\\."] = "\uE00D\uE014\uE402";
		escapes["\\!"] = "\uE010\uE014\uE402";

		for(var key in escapes)
		{
			var r = new RegExp(key.replace(/([\\\[\]\(\)\{\}\*\+])/g,"\\$1"), "g");
			text = text.replace(r, escapes[key]);
		}
		//url replacements

		

		// [text](htt) style links

		text = text.replace(/\[([^\[\]]*)\] ?\(([^()}]*)\)/g, "<a href='$2'>$1</a>")

		// <https://...> style links
		var RefLinkPat = /<(\w+:\/\/[^>]*)>/;
		var match = RefLinkPat.exec(text);
		while(match)
		{
			var url = match[1];
			
			var linkText = url;
			linkText = url.length > 50 ? url.substring(0,47) + "..." : url; 


			text = text.replace(match[0], "<a href='" + url + "'>" + linkText + "</a>");
			match = RefLinkPat.exec(text);
		}

	


		//strong rule **
		text = text.replace(/ \*\*([^\s]|[^\s][\s\S]*?[^\s])\*\* /g," <strong>$1</strong> ");
		text = text.replace(/ __([^\s]|[^\s][\s\S]*?[^\s])__ /g," <strong>$1</strong> ");


		//emphasis rule *
		text = text.replace(/ \*([^\s]|[^\s][\s\S]*?[^\s])\* /g," <em>$1</em> ");
		text = text.replace(/ _([^\s]|[^\s][\s\S]*?[^\s])_ /g," <em>$1</em> ");

		text = text.replace(/§(\w+)/g, "<a onclick='linkHandler(\"$1\"); return false;' href='?$1'>$1</a>");

		var code = /<script>([\s\S]*)<\/script>/.exec(text);


		for(key in escapes)
		{
			var r = new RegExp(escapes[key], "g");
			text = text.replace(r, key.substring(1));
		}

		if(element.type == "")
			return text;

		var anchor = (element.id ? `<span id="${element.id}" style="position: relative; top: -20px"></span>` : "")
		var idfAttr = element.id || "";
		return `${anchor}<${element.type} idf="${idfAttr}">${text}</${element.type}>`;
	}
}
