import { useConnection, useWallet } from "@solana/wallet-adapter-react"
import * as web3 from "@solana/web3.js"
import { FC, useState, useEffect } from "react"
import styles from "../styles/Home.module.css"
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
} from "@solana/spl-token"
import {
  DataV2,
  createCreateMetadataAccountV2Instruction,
} from "@metaplex-foundation/mpl-token-metadata"
import {
  findMetadataPda,
  MetaplexFile,
  toMetaplexFileFromBrowser,
  bundlrStorage,
  Metaplex,
  walletAdapterIdentity,
} from "@metaplex-foundation/js"

export const CreateMintForm: FC = () => {
  const [txSig, setTxSig] = useState("")
  const [mint, setMint] = useState("")

  const [tokenName, setTokenName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [description, setDescription] = useState("")

  const [imageUrl, setImageUrl] = useState(null)
  const [metadataUrl, setMetadataUrl] = useState(null)

  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()
  const wallet = useWallet()

  // set up metaplex
  const metaplex = new Metaplex(connection).use(
    bundlrStorage({
      address: "https://devnet.bundlr.network",
      providerUrl: "https://api.devnet.solana.com",
      timeout: 60000,
    })
  )

  if (wallet) {
    metaplex.use(walletAdapterIdentity(wallet))
  }

  // upload image
  const handleImage = async (event) => {
    const file: MetaplexFile = await toMetaplexFileFromBrowser(
      event.target.files[0]
    )

    const imageUrl = await metaplex.storage().upload(file)
    setImageUrl(imageUrl)
  }

  // upload metadata (off chain data)
  const uploadMetadata = async () => {
    const data = {
      name: tokenName,
      symbol: symbol,
      description: description,
      image: imageUrl,
    }
    const { uri } = await metaplex.nfts().uploadMetadata(data).run()
    setMetadataUrl(uri)
  }

  // create mint and metadata account
  const createMint = async (data) => {
    if (!metadataUrl) {
      return
    }

    // keypair for new mint
    const mint = web3.Keypair.generate()

    // rent for new mint
    const lamports = await getMinimumBalanceForRentExemptMint(connection)

    // get metadata account address
    const metadataPDA = await findMetadataPda(mint.publicKey)

    // onchain metadata format
    const tokenMetadata = {
      name: tokenName,
      symbol: symbol,
      uri: metadataUrl,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    } as DataV2

    // create new transaction
    const transaction = new web3.Transaction()

    // add instructions
    transaction.add(
      // create new account
      web3.SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mint.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      // create new mint
      createInitializeMintInstruction(
        mint.publicKey, // mint address
        0, // decimals
        publicKey, // mint authority
        publicKey, // freeze authority
        TOKEN_PROGRAM_ID // token program
      ),
      // create new metadata account
      createCreateMetadataAccountV2Instruction(
        {
          metadata: metadataPDA,
          mint: mint.publicKey,
          mintAuthority: publicKey,
          payer: publicKey,
          updateAuthority: publicKey,
        },
        {
          createMetadataAccountArgsV2: {
            data: tokenMetadata,
            isMutable: true,
          },
        }
      )
    )

    sendTransaction(transaction, connection, {
      signers: [mint],
    }).then((sig) => {
      setTxSig(sig)
      setMint(mint.publicKey.toString())
    })
  }

  // create mint once metadata uploaded
  useEffect(() => {
    createMint({
      metadata: metadataUrl,
    })
  }, [metadataUrl])

  // solana explorer url to token mint
  const link = () => {
    return txSig
      ? `https://explorer.solana.com/address/${mint}?cluster=devnet`
      : ""
  }

  return (
    <div>
      {publicKey ? (
        <div className={styles.form}>
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            type="text"
            className={styles.formField}
            placeholder="Enter Token Name"
            onChange={(e) => setTokenName(e.target.value)}
          />
          <label htmlFor="symbol">Symbol:</label>
          <input
            id="symbol"
            type="text"
            className={styles.formField}
            placeholder="Enter Token Symbol"
            onChange={(e) => setSymbol(e.target.value)}
          />
          <label htmlFor="description">Description:</label>
          <input
            id="description"
            type="text"
            className={styles.formField}
            placeholder="Enter Token Description"
            onChange={(e) => setDescription(e.target.value)}
          />
          {imageUrl ? (
            <span>Image Uploaded</span>
          ) : (
            <input
              id="image-upload"
              name="image-upload"
              type="file"
              className={styles.formField}
              placeholder="Enter Token Symbol"
              onChange={handleImage}
            />
          )}
          <button
            className={styles.formButton}
            onClick={async () => uploadMetadata()}
          >
            Create Mint
          </button>
        </div>
      ) : (
        <span>Connect Your Wallet</span>
      )}
      {txSig ? (
        <div>
          <p>Token Mint Address: {mint}</p>
          <a href={link()}>View Token on Solana Explorer</a>
        </div>
      ) : null}
    </div>
  )
}
