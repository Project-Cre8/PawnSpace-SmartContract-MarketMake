require('dotenv').config()
const ethers = require('ethers')
const PawnFactoryABI = require('./build/contracts/PawnFactory.json')
const PawnSpaceABI = require('./build/contracts/PawnSpace.json')
const ERC20ABI = require('./build/contracts/ERC20_test.json')
const ERC721ABI = require('./build/contracts/ERC721_test.json')

const provider = new ethers.providers.InfuraProvider('kovan', process.env.INFURA_ID)
const wallet = new ethers.Wallet.fromMnemonic(process.env.MNEMONIC)
const signer = new ethers.Wallet(wallet.privateKey, provider)

const token = '0xe22da380ee6B445bb8273C81944ADEB6E8450422' // USDC in Kovan
const aToken = '0xe12AFeC5aa12Cf614678f9bFeeB98cA9Bb95b5B0' // aUSDC in Kovan
const AAVE = '0x9FE532197ad76c5a68961439604C037EB79681F0' // Lending Pool in Kovan
const nft = '0xB57f33633232577F2f2cFE2879eDf89Df0FE3Cf3' // ERC721_test in Kovan
const pawnFactory = '0xB2Dfc879659F94B4f2110983cB0525374d60512E' // First PawnFactory in Kovan

const PawnFactory = new ethers.Contract(pawnFactory, PawnFactoryABI.abi, signer)
const StableToken = new ethers.Contract(token, ERC20ABI.abi, signer)
const NFTToken = new ethers.Contract(nft, ERC721ABI.abi, signer)

const gasLimit = 800000
const gasPrice = ethers.utils.parseUnits('30', 'gwei')
const decimalKovan = 10 ** 6

async function mintNFT(address) {
  return await NFTToken.mint(address, { gasLimit })
}

async function getSpaceAddress(nftAddress) {
  return await PawnFactory.getSpace(nftAddress)
}

async function createSpace(nftAddress) {
  return await PawnFactory.createSpace(nftAddress)
}

async function order(nftIds, amount, interest, period, additional) {
  await nftIds.forEach(async (id) => {
    await NFTToken.approve(pawnSpace, id)
  })
  await StableToken.approve(pawnSpace, additional)
  return await PawnSpace.order(ids, amount, interest, period, additional, { gasLimit, gasPrice })
}

/*** Create Space ***/
// createSpace(nft)
// getSpaceAddress(nft).then((res) => console.log(res))
const pawnSpace = '0x6467E8d64417659f8631cbF4A420BA5eF9533442' // First PawnSpace in Kovan
const PawnSpace = new ethers.Contract(pawnSpace, PawnSpaceABI.abi, signer)

/*** Mint NFT ***/
// mintNFT('0x66283ec04D16B25dD2DEa83A440b9Ee32221055B').then((res) => console.log(res))

/*** Create Order ***/
// order(
//   [0],
//   ethers.utils.parseUnits('100', 'mwei'), // convert to USDC decimals
//   ethers.utils.parseUnits('10', 'mwei'), // convert to USDC decimals
//   30 * 24 * 60 * 60,
//   ethers.utils.parseUnits('30', 'mwei') // convert to USDC decimals
// ).then((res) => console.log(res))

NFTToken.ownerOf(0).then((res) => console.log(res))
