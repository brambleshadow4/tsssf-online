import {cardSearchBar} from "./cardSearchBarComponent.js";
import {CardProps} from "../../model/lib.js";

var oldPopupAccept: undefined | ((value?: any) => any) ;

export function createPopup(title: string, miniMode: boolean, renderFun: (acceptFun: (value?: any) => any) => HTMLElement)
{
	var className = miniMode ? "mini" : "normal";

	return createPopupShared(className, title, renderFun, {});
	
}

export function createSearchPopup(title: string, cards: {[key:string]: CardProps}, renderFun: (filters: any[], acceptFun: (value?: any) => any) => HTMLElement)
{
	return createPopupShared("normal", title, undefined, {searchBar: cards, filterRenderFun: renderFun});	
}


export function createTabbedPopup(tabs: {
		render: (acceptFun: (value?: any) => any) => HTMLElement,
		name?: string,
	}[]
)
{
	return createPopupShared("normal popupWithTabs", undefined, undefined, {tabs});
}

function createPopupShared(
	className: string,
	title?: string,
	renderFun?: (acceptFun: (value?: any) => any) => HTMLElement,
	options?:{
		tabs?: {
			render: (acceptFun: (value?: any) => any) => HTMLElement ,
			name?: string,
		}[],
		searchBar?: {[key:string]: CardProps},
		filterRenderFun?: (filters: any[], acceptFun: (value?: any) => any) => HTMLElement,
	}
){
	let opt = options || {};

	if(oldPopupAccept)
		oldPopupAccept();

	//each tab has a function render(closePopupWithVal)
	// closePopupWithVal closes the popup and accepts the promise with val.
	function handler(accept: (value?: any) => any, reject: (value?: any) => any)
	{
		var closeButton = document.createElement('img');
		closeButton.src = "/img/close.svg";
		closeButton.id = "popupCloseButton";

		var parent = document.createElement('div');
		parent.className = "popupContainer";

		var div = document.createElement('div');
		div.className = "popup";

		div.className += " " + className


		// When we call a tab's render function, we send it the newAccept function
		// so that the render can close the popup with value val
		function newAccept(val?: any)
		{
			if(parent.parentNode){
				parent.parentNode.removeChild(parent);
			}

			window.removeEventListener("keyup", closePopupListener);

			oldPopupAccept = undefined;
			accept(val);
		}

		closeButton.onclick = function(){newAccept();}

		function closePopupListener(e: any)
		{
			if(e.key == "Escape")
			{
				newAccept();
			}
		}

		window.addEventListener("keyup", closePopupListener);

		oldPopupAccept = newAccept;

		var initialContent;

		if(opt.tabs)
		{
			let tabs = opt.tabs;
			var tabDiv = document.createElement('div');
			tabDiv.className = 'popupTabs';


			for(let i =0; i < opt.tabs.length; i++)
			{
				let tab = document.createElement('div');
				let tabName = opt.tabs[i].name;
				if(tabName){
					tab.innerHTML = tabName;
				}

				tabDiv.appendChild(tab);

				tab.onclick = function()
				{
					for(let j=0; j<tabDiv.children.length; j++){
						tabDiv.children[j].classList.remove('selected')
					}

					tab.classList.add('selected');

					var container = document.getElementById('popupContent')!;
					container.innerHTML = "";


					container.appendChild(tabs[i].render(newAccept));
				}
			}

			let closeTab = document.createElement('div');
			closeTab.className = "closeButtonTab";
			closeTab.appendChild(closeButton);
			tabDiv.appendChild(closeTab);

			tabDiv.children[0].classList.add('selected');


			div.appendChild(tabDiv);
		}

		if(title)
		{
			var titleBar = document.createElement('div');
			titleBar.className = "popupTitleBar";
			
			titleBar.innerHTML = "<span class='popupTitleBarTitle'>" + title + "</span>";
			
			var center = document.createElement('div');
			center.className = 'popupTitleBarCenter';
			titleBar.appendChild(center);


			titleBar.appendChild(closeButton);
			div.appendChild(titleBar);

			if(opt.searchBar)
			{
				var [searchBar, _] = cardSearchBar(opt.searchBar, (newFilters) => 
				{
					if (opt.filterRenderFun)
					{
						container.innerHTML = "";
						container.appendChild(opt.filterRenderFun(newFilters, newAccept));
					}
				});
							
				center.appendChild(searchBar)
			}
		}

		var container = document.createElement('div');
		container.id = "popupContent";

		div.appendChild(container)

		if(opt.tabs)
		{
			container.appendChild(opt.tabs[0].render(newAccept));
		}
		else if (renderFun)
		{
			container.appendChild(renderFun(newAccept));
		}
		else if (opt.filterRenderFun)
		{
			container.appendChild(opt.filterRenderFun([], newAccept));
		}

		parent.appendChild(div)
		document.body.appendChild(parent);
	}

	return new Promise(handler);
}

export function htmlTab(html: string)
{
	return function()
	{
		var div = document.createElement('div');
		div.innerHTML = html;
		return div;
	}
}
