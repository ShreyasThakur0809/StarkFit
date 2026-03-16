import { RpcProvider, Account, json, CallData, hash } from "starknet";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const RPC_URL = "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/5sF0mkfo834fgZ0BVRo1ubDqYLuCRcSm";
const PRIVATE_KEY = "0x00242463f2a1765461a9125fa757af2a139bde221c43e408cdb1c3faba86875f";
const DEPLOYER_ADDRESS = "0x06B71E951818DF697930F48E2505C3A2F6b917eBA7B0f099575D196803C7ef05";

const STRK_ADDRESS = "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

async function main() {
  console.log("==> Connecting to Starknet Sepolia...");
  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  const chainId = await provider.getChainId();
  console.log("   Chain ID:", chainId);

  const account = new Account(provider, DEPLOYER_ADDRESS, PRIVATE_KEY);

  const nonce = await account.getNonce();
  console.log("   Account nonce:", nonce);

  // Check STRK balance
  try {
    const balResult = await provider.callContract({
      contractAddress: STRK_ADDRESS,
      entrypoint: "balanceOf",
      calldata: CallData.compile({ account: DEPLOYER_ADDRESS }),
    });
    const balance = BigInt(balResult[0]);
    console.log("   STRK balance:", (Number(balance) / 1e18).toFixed(4), "STRK");
  } catch (e) {
    console.log("   Could not check STRK balance");
  }

  // Read compiled contract
  const sierraPath = resolve(ROOT, "contracts/target/dev/starkfit_contracts_StarkFit.contract_class.json");
  const casmPath = resolve(ROOT, "contracts/target/dev/starkfit_contracts_StarkFit.compiled_contract_class.json");

  console.log("\n==> Reading contract artifacts...");
  const sierra = json.parse(readFileSync(sierraPath).toString("ascii"));
  const casm = json.parse(readFileSync(casmPath).toString("ascii"));

  // Step 1: Declare and Deploy together
  console.log("\n==> Declaring and deploying contract...");
  console.log("   Owner:", DEPLOYER_ADDRESS);
  console.log("   Oracle:", DEPLOYER_ADDRESS, "(same for hackathon)");

  try {
    const result = await account.declareAndDeploy({
      contract: sierra,
      casm,
      constructorCalldata: CallData.compile({
        owner: DEPLOYER_ADDRESS,
        oracle: DEPLOYER_ADDRESS,
      }),
    });

    console.log("   Declare tx:", result.declare.transaction_hash);
    console.log("   Class hash:", result.declare.class_hash);
    console.log("   Deploy tx:", result.deploy.transaction_hash);
    console.log("   Contract address:", result.deploy.contract_address);

    console.log("\n=========================================");
    console.log("  Contract deployed successfully!");
    console.log("  Address:", result.deploy.contract_address);
    console.log("=========================================");
    console.log("\nAdd to .env.local:");
    console.log(`NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS=${result.deploy.contract_address}`);
  } catch (e) {
    const baseError = e.baseError || {};
    const errorData = baseError.data || {};
    console.error("   Failed!");
    console.error("   Code:", baseError.code);
    console.error("   Message:", baseError.message || e.message?.slice(0, 300));
    if (errorData.execution_error) {
      console.error("   Execution error:", errorData.execution_error.slice(0, 300));
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e.message?.slice(0, 500) || e);
  process.exit(1);
});
