var x;
var linkElement;
var headings = new Set(["H1", "H2","H3","H4"]);

var parentParent;

window.addEventListener('mouseover', function(e){

	let parent = e.originalTarget;

	if(headings.has(e.originalTarget.tagName) && parent.id)
	{
		
		if(linkElement)
		{
			linkElement.parentNode.removeChild(linkElement);
			linkElement = undefined;
		}

		x = parent;

		linkElement = document.createElement('div');

		linkElement.style.backgroundImage = "url(/img/link.svg)";
		linkElement.style.backgroundSize = "20px 20px";
		
		linkElement.style.height = "20px";
		linkElement.style.width = "20px";

		parent.style.position = "relative";
		linkElement.style.position = "absolute";
		linkElement.style.top = "2px";
		linkElement.style.left = "-25px";
		linkElement.style.cursor = "pointer";

		if(parent.id)
		{
			linkElement.onclick = () => {window.location.href = "#" + parent.id};
		}

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