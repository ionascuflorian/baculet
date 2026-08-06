import { ListPageSkeleton } from "@/components/skeletons/page-skeletons";

export default function Loading() {
  return <ListPageSkeleton columns={3} items={6} />;
}
