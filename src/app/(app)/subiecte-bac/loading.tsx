import { ListPageSkeleton } from "@/components/skeletons/page-skeletons";

export default function Loading() {
  return <ListPageSkeleton columns={2} items={4} />;
}
