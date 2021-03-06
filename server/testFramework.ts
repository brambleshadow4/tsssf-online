let fileCount = 1;
let tests: [string, Function][] = [];

import goalTests from "./goals.test.js"; goalTests();


export function test(name: string, fun: Function): void {
	tests.push([name, fun]);
}

export function expect(value1: any)
{
	return {
		toBe: function(value2: any)
		{
			if(value1 !== value2)
			{
				throw new Error(`Expected ${value1} to be ${value2}`);
			}
		}
	}
}

let passCount = 0;
let fails = [];
for(var item of tests)
{
	let [name, fun] = item;

	try
	{
		fun();
		passCount++;
	}
	catch(e)
	{
		console.log("TEST FAILED " + name);
		console.log(e)
	}

}

console.log(`${passCount}/${tests.length} passed`);


// ADD TEST FILES





