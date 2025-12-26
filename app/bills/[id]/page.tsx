export default function BillDetailPage({ params }: { params: { id: string } }) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Bill #{params.id}</h1>
        <p>Bill details go here.</p>
      </div>
    );
  }
  