import { Chain, Common, Hardfork } from '@ethereumjs/common'
import { FeeMarketEIP1559Transaction } from '@ethereumjs/tx'
import { Account, Address, privateToAddress } from '@ethereumjs/util'
import { bytesToHex, hexToBytes } from 'ethereum-cryptography/utils'
import * as tape from 'tape'

import { VM } from '../../../src/vm'
const pkey = hexToBytes('20'.repeat(32))
const GWEI = BigInt('1000000000')
const sender = new Address(privateToAddress(pkey))

tape('EIP 3860 tests', (t) => {
  const common = new Common({
    chain: Chain.Mainnet,
    hardfork: Hardfork.London,
    eips: [3860],
  })

  t.test('EIP-3860 tests', async (st) => {
    const vm = await VM.create({ common })
    await vm.stateManager.putAccount(sender, new Account())
    const account = await vm.stateManager.getAccount(sender)
    const balance = GWEI * BigInt(21000) * BigInt(10000000)
    account!.balance = balance
    await vm.stateManager.putAccount(sender, account!)

    const bytes = new Uint8Array(1000000).fill(0x60)
    // We create a tx with a common which has eip not yet activated else tx creation will
    // throw error
    const txCommon = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.London })
    const tx = FeeMarketEIP1559Transaction.fromTxData(
      {
        data:
          '0x7F6000020000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000060005260206000F3' +
          bytesToHex(bytes),
        gasLimit: 100000000000,
        maxFeePerGas: 7,
        nonce: 0,
      },
      { common: txCommon }
    ).sign(pkey)
    const result = await vm.runTx({ tx })
    st.ok(
      (result.execResult.exceptionError?.error as string) === 'initcode exceeds max initcode size',
      'initcode exceeds max size'
    )
  })
})
