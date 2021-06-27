let testNo = Number(process.argv[2]) || 0;

let fileCount = 1;
let tests: [string, Function][] = [];

let beforeEachClosure: Function | undefined = undefined;

export function group(name: string, fun: Function)
{

	let oldBeforeEach = beforeEachClosure;

	fun();

	beforeEachClosure = oldBeforeEach;
}

export function beforeEach(fun: Function)
{
	if(beforeEachClosure == undefined)
	{
		beforeEachClosure = fun;
	}
	else
	{
		let f = beforeEachClosure;
		beforeEachClosure = () => {f(); fun();}
	}
}


export function test(name: string, fun: Function): void {

	if(beforeEachClosure)
	{
		let f = beforeEachClosure;
		tests.push([name, () => {f(); fun()}])
	}
	else
	{
		tests.push([name, fun]);
	}
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

import goalTests from "./goals.test.js"; goalTests();

let passCount = 0;
let fails = [];

if(testNo)
{
	let [name, fun] = tests[testNo-1];
	let failed = false;
	try
	{
		fun();
		passCount++;
	}
	catch(e)
	{
		console.log("TEST FAILED " + name);
		console.log(e);
		failed = true;
	}

	if(!failed)
	{
		console.log("TEST PASSED");
	}
}
else
{
	let no = 1;
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
			console.log("TEST #" + no + " FAILED " + name);
			console.log(e)
		}

		no++;
	}

	console.log(`${passCount}/${tests.length} passed`);
}





// ADD TEST FILES





