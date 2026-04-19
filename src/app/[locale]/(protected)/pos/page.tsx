import POSLayout from './_components/POSLayout'

export default function POSPage() {
  return (
    <POSLayout shiftStatus="open" cashierName="Cashier">
      <div className="flex items-center justify-center h-full text-on-surface-variant">
        <p>Loading POS...</p>
      </div>
    </POSLayout>
  )
}