import { RpcProvider, Account, json, Contract, CallData, stark, hash } from "starknet";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Config
const RPC_URL = "https://starknet-sepolia.public.blastapi.io/rpc/v0_8";
const PRIVATE_KEY = "0x00242463f2a1765461a9125fa757af2a139bde221c43e408cdb1c3faba86875f";
const DEPLOYER_ADDRESS = "0x06B71E951818DF697930F48E2505C3A2F6b917eBA7B0f099575D196803C7ef05";

async function main() {
  console.log("==> Connecting to Starknet Sepolia...");
  const provider = new RpcProvider({ nodeUrl: RPC_URL });

  const chainId = await provider.getChainId();
  console.log("   Chain ID:", chainId);

  const account = new Account(provider, DEPLOYER_ADDRESS, PRIVATE_KEY);

  // Check balance
  try {
    const nonce = await account.getNonce();
    console.log("   Account nonce:", nonce);
  } catch (e) {
    console.error("   Error getting nonce — account may not be deployed:", e.message);
    process.exit(1);
  }

  // Read compiled contract
  const sierraPath = resolve(ROOT, "contracts/target/dev/starkfit_contracts_StarkFit.contract_class.json");
  const casmPath = resolve(ROOT, "contracts/target/dev/starkfit_contracts_StarkFit.compiled_contract_class.json");

  console.log("\n==> Reading contract artifacts...");
  const sierra = json.parse(readFileSync(sierraPath).toString("ascii"));
  const casm = json.parse(readFileSync(casmPath).toString("ascii"));

  // Declare
  console.log("\n==> Declaring contract class...");
  try {
    const declareResponse = await account.declare({ contract: sierra, casm });
    console.log("   Declare tx:", declareResponse.transaction_hash);
    console.log("   Class hash:", declareResponse.class_hash);

    console.log("   Waiting for declaration...");
    await provider.waitForTransaction(declareResponse.transaction_hash);
    console.log("   Declaration confirmed!");

    // Deploy
    console.log("\n==> Deploying contract...");
    console.log("   Owner:", DEPLOYER_ADDRESS);
    console.log("   Oracle:", DEPLOYER_ADDRESS, "(same for hackathon)");

    const deployResponse = await account.deployContract({
      classHash: declareResponse.class_hash,
      constructorCalldata: CallData.compile({
        owner: DEPLOYER_ADDRESS,
        oracle: DEPLOYER_ADDRESS,
      }),
    });

    console.log("   Deploy tx:", deployResponse.transaction_hash);
    console.log("   Waiting for deployment...");
    await provider.waitForTransaction(deployResponse.transaction_hash);

    console.log("\n=========================================");
    console.log("Contract deployed!");
    console.log("Address:", deployResponse.contract_address);
    console.log("=========================================");
    console.log("\nUpdate .env.local with:");
    console.log(`NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS=${deployResponse.contract_address}`);

  } catch (e) {
    // If already declared, try to compute hash and deploy
    if (e.message?.includes("already declared") || e.message?.includes("StarknetErrorCode.CLASS_ALREADY_DECLARED")) {
      console.log("   Class already declared, computing hash...");
      const classHash = hash.computeContractClassHash(sierra);
      console.log("   Class hash:", classHash);

      console.log("\n==> Deploying contract...");
      const deployResponse = await account.deployContract({
        classHash,
        constructorCalldata: CallData.compile({
          owner: DEPLOYER_ADDRESS,
          oracle: DEPLOYER_ADDRESS,
        }),
      });

      console.log("   Deploy tx:", deployResponse.transaction_hash);
      console.log("   Waiting for deployment...");
      await provider.waitForTransaction(deployResponse.transaction_hash);

      console.log("\n=========================================");
      console.log("Contract deployed!");
      console.log("Address:", deployResponse.contract_address);
      console.log("=========================================");
      console.log("\nUpdate .env.local with:");
      console.log(`NEXT_PUBLIC_STARKFIT_CONTRACT_ADDRESS=${deployResponse.contract_address}`);
    } else {
      console.error("Error:", e.message || e);
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
