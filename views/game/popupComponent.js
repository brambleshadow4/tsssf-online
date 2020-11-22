var oldPopupAccept;

export function createPopup(tabs, miniMode)
{

	if(oldPopupAccept)
		oldPopupAccept();

	//each tab has a function render(closePopupWithVal)
	// closePopupWithVal closes the popup and accepts the promise with val.
	function handler(accept, reject)
	{

		var closeButton = document.createElement('img');
		closeButton.src = "/img/close.svg";
		closeButton.id = "popupCloseButton";

		var parent = document.createElement('div');
		parent.className = "popupContainer";

		
		var div = document.createElement('div');
		div.className = "popup";
		if(miniMode)
			div.className += " mini";
		else
			div.className += " normal"

		// When we call a tab's render function, we send it the newAccept function
		// so that the render can close the popup with value val
		function newAccept(val)
		{
			parent.parentNode.removeChild(parent);
			oldPopupAccept = undefined;
			accept(val);
		}

		closeButton.onclick = function(){newAccept();}

		oldPopupAccept = newAccept;

		
		var initialContent;

		if(tabs.length > 1)
		{
			var tabDiv = document.createElement('div');
			tabDiv.className = 'popupTabs';


			for(let i =0; i < tabs.length; i++)
			{
				var tab = document.createElement('div');
				let tabName = tabs[i].name;
				tab.innerHTML = tabName;
				tabDiv.appendChild(tab);

				tab.onclick = function()
				{
					for(let j=0; j<tabDiv.children.length; j++)
					{
						tabDiv.children[j].classList.remove('selected')
					}

					this.classList.add('selected');

					var container = document.getElementById('popupContent');
					container.innerHTML = "";
					container.appendChild(tabs[i].render(newAccept));
				}
			}

			tabDiv.children[0].classList.add('selected');

			div.appendChild(tabDiv);
		}

		var container = document.createElement('div');
		container.id = "popupContent";

		div.appendChild(container)

		container.appendChild(tabs[0].render(newAccept));

		div.appendChild(closeButton);

		parent.appendChild(div)

		document.body.appendChild(parent);

	}

	return new Promise(handler);
}

export function htmlTab(html)
{
	return function()
	{
		var div = document.createElement('div');
		div.innerHTML = html;
		return div;
	}
}
