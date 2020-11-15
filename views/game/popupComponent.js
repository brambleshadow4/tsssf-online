export function createPopup(tabs)
{

	//each tab has a function render(closePopupWithVal)
	// closePopupWithVal closes the popup and accepts the promise with val.
	function handler(accept, reject)
	{
		var closeButton = document.createElement('img');
		closeButton.src = "/img/close.svg";
		closeButton.id = "popupCloseButton";
		closeButton.onclick = function()
		{
			var div = document.getElementsByClassName('popup')[0];
			div.parentNode.removeChild(div);
			this.parentNode.removeChild(this);
			accept();
		}

		// When we call a tab's render function, we send it the newAccept function
		// so that the render can close the popup with value val
		function newAccept(val)
		{
			div.parentNode.removeChild(div);
			closeButton.parentNode.removeChild(closeButton);
			accept(val);
		}


		var div = document.createElement('div');
		div.className = "popup";
		
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

		document.body.appendChild(closeButton);
		document.body.appendChild(div);
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
