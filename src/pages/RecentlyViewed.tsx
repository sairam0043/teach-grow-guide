import { Link } from "react-router-dom";
import PageLayout from "@/components/layout/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { resolveAssetUrl } from "@/lib/assetUrl";

const RecentlyViewed = () => {
  const key = "recentlyViewedTutors";
  let items: any[] = [];
  try {
    items = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (e) {
    items = [];
  }

  return (
    <PageLayout>
      <div className="container py-10 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4">Recently Viewed Tutors</h1>
        {items.length === 0 ? (
          <Card className="p-6">
            <CardContent className="text-muted-foreground">You haven't viewed any tutor profiles yet.</CardContent>
            <div className="mt-4">
              <Button asChild>
                <Link to="/tutors">Browse Tutors</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {items.slice(0, 7).map((t: any) => (
              <Card key={t.id} className="overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <img
                    src={t.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=random&size=160`}
                    alt={t.name}
                    className="h-20 w-20 rounded-md object-cover"
                  />
                  <div>
                    <div className="font-semibold text-lg">{t.name}</div>
                    <div className="text-sm text-muted-foreground">Viewed: {new Date(t.timestamp).toLocaleString()}</div>
                    <div className="mt-2">
                      <Button size="sm" asChild>
                        <Link to={t.url}>View Profile</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default RecentlyViewed;
