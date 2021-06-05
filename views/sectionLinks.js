var x;
var linkElement;
var headings = new Set(["H1", "H2","H3","H4"]);

var parentParent;

window.addEventListener('mouseover', function(e){

	let parent = e.target;
	let parentID = parent.id || parent.getAttribute('idf');

	if(headings.has(parent.tagName) && parentID)
	{
		
		if(linkElement)
		{
			linkElement.parentNode.removeChild(linkElement);
			linkElement = undefined;
		}

		x = parent;

		linkElement = document.createElement('a');
		linkElement.href = "#" + parentID;

		linkElement.style.backgroundImage = "url(/img/link.svg)";
		linkElement.style.backgroundSize = "20px 20px";
		
		linkElement.style.height = "20px";
		linkElement.style.width = "20px";

		parent.style.position = "relative";
		parent.style.zIndex = "1";
		linkElement.style.position = "absolute";
		linkElement.style.top = "2px";
		linkElement.style.left = "-25px";
		linkElement.style.cursor = "pointer";

		parentParent = parent.parentNode;
		if(parent.childNodes.length > 0)
		{
			parent.insertBefore(linkElement, parent.childNodes[0])
		}
	}
	else
	{
		if(linkElement && parent != parentParent && parent != linkElement)
		{
			linkElement.parentNode.removeChild(linkElement);
			linkElement = undefined;
		}
	}

})