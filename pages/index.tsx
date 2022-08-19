import { NextPage } from "next"
import styles from "../styles/Home.module.css"
import { AppBar } from "../components/AppBar"
import { BalanceDisplay } from "../components/BalanceDisplay"
import { MintToForm } from "../components/MintToForm"
import { CreateTokenAccountForm } from "../components/CreateTokenAccount"
import { CreateMintForm } from "../components/CreateMint"
import Head from "next/head"

const Home: NextPage = (props) => {
  return (
    <div className={styles.App}>
      <Head>
        <title>Token Program</title>
        <meta name="description" content="Token Program" />
      </Head>
      <AppBar />
      <div className={styles.AppBody}>
        <BalanceDisplay />
        <CreateMintForm />
        <CreateTokenAccountForm />
        <MintToForm />
      </div>
    </div>
  )
}

export default Home
