import './App.css';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {useState, useEffect} from "react";
import {ContractPromise} from '@polkadot/api-contract';
import abi from './change_with_your_own_metadata.json';
import {web3Accounts, web3Enable, web3FromSource} from '@polkadot/extension-dapp';

function App() {
    const [block, setBlock] = useState(null);
    const [actingAddress, setActingAddress] = useState(null);
    const [lastBlockHash, setLastBlockHash] = useState(null);
    const [api, setApi] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [result, setResult] = useState(null);
    const [gasConsumed, setGasConsumed] = useState(null);
    const [outcome, setOutcome] = useState(null);
    const [contractAddress, setContractAddress] = useState(null);
    const [blockchainUrl, setBlockchainUrl] = useState('ws://127.0.0.1:9944');

    // NOTE the apps UI specified these in mega units -> https://polkadot.js.org/docs/api-contract/start/contract.read
    const gasLimit = 3000n * 1000000n;

    // Read from the contract via an RPC call
    const value = 0; // only useful on isPayable messages -> https://polkadot.js.org/docs/api-contract/start/contract.read

    const extensionSetup = async () => {
        const extensions = await web3Enable('Polk4NET');
        if (extensions.length === 0) {
            return;
        }
        setAccounts(await web3Accounts());
    };

    useEffect(() => {
        setup();
    }, []);


    async function getFlipValue() {
        const contract = new ContractPromise(api, abi, contractAddress);
        const {gasConsumed, result, output} = await contract.query.get(actingAddress, {value, gasLimit});
        setGasConsumed(gasConsumed.toHuman());
        setResult(JSON.stringify(result.toHuman()));
        setOutcome(output.toHuman().toString());
    }

    async function changeFlipValue() {
        const contract = new ContractPromise(api, abi, contractAddress);
        const performingAccount = accounts.filter(a => a.address === actingAddress)[0];
        const injector = await web3FromSource(performingAccount.meta.source);
        await contract.tx
            .flip({value, gasLimit})
            .signAndSend(performingAccount.address, {signer: injector.signer}, (result) => {
                if (result.status.isInBlock) {
                    setResult('in a block');
                } else if (result.status.isFinalized) {
                    setResult('finalized');
                }
            });
    }

    async function setup() {
        const wsProvider = new WsProvider(blockchainUrl);
        const api = await ApiPromise.create({provider: wsProvider});
        await api.rpc.chain.subscribeNewHeads((lastHeader) => {
            setBlock(`${lastHeader.number}`);
            setLastBlockHash(`${lastHeader.hash}`);
        });
        setApi(api);
        await extensionSetup();
    }

    return (
        <div className="App">
            <p>Polkadot test net well-known seed for Alice (Derive for any other if needed like Bob Eve etc.) use it in
                extension to create a test account: "bottom drive obey lake curtain smoke basket hold race lonely fit
                walk//Alice"</p>
            <p>Block: {block}</p>
            <p>Blockchain URL: {blockchainUrl}</p>
            <p>Custom Blockchain URL</p>
            <button onClick={setup}>Change Blockchain URL</button>
            <input onChange={(event) => setBlockchainUrl(event.target.value)}/>
            <p>Last block hash: {lastBlockHash}</p>
            <p>Input contract address (from your canvas UI after you instantiate it): {contractAddress}</p>
            <input onChange={(event) => setContractAddress(event.target.value)}/>
            <br/>
            <p>Acting account (select from dropdown): {actingAddress ? actingAddress : '...'}</p>
            <br/>
            <select onChange={(event) => {
                console.log(event);
                setActingAddress(event.target.value)
            }}>
                {accounts.map(a => <option value={a.address}>{a.address} [{a.meta.name}]</option>)}
            </select>
            <br/>
            <br/>
            <button disabled={!api || !contractAddress}
                    onClick={getFlipValue}>{api && contractAddress ? 'Get flip value!' : 'Couldn\'t load API or contract address is invalid, please see logs in console.'}</button>
            <br/>
            <br/>
            <button disabled={!api || !contractAddress}
                    onClick={changeFlipValue}>{api && contractAddress ? 'Change flip value!' : 'Couldn\'t load API or contract address is invalid, please see logs in console.'}</button>
            <p>Result: {result}</p>
            <p>Outcome: {outcome}</p>
            <p>Gas consumed: {gasConsumed}</p>
        </div>
    );
}

export default App;
