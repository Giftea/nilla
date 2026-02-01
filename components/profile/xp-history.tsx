"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Star, ChevronLeft, ChevronRight } from "lucide-react";

interface XpTransaction {
  id: string;
  action: string;
  description: string | null;
  xp_amount: number;
  created_at: string;
}

interface XpHistoryProps {
  transactions: XpTransaction[];
}

const ITEMS_PER_PAGE = 10;

export function XpHistory({ transactions }: XpHistoryProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = transactions.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <Card className="border-0 shadow-lg shadow-violet-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25">
            <Zap className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Recent XP Earned
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {paginatedTransactions.length > 0 ? (
          <div className="space-y-3">
            {paginatedTransactions.map((xp, index) => (
              <div
                key={xp.id}
                className="flex items-center justify-between rounded-xl border border-violet-500/10 bg-gradient-to-r from-violet-500/5 to-transparent p-4 transition-all hover:border-violet-500/20 hover:shadow-md"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
                    <Star className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {xp.description || xp.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(xp.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white border-0 shadow-md shadow-violet-500/25">
                  +{xp.xp_amount} XP
                </Badge>
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                  {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of{" "}
                  {totalItems} transactions
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((page) => {
                        if (totalPages <= 5) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .map((page, index, array) => (
                        <span key={page} className="flex items-center">
                          {index > 0 && array[index - 1] !== page - 1 && (
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          )}
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            className={
                              currentPage === page
                                ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white border-0"
                                : ""
                            }
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        </span>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 mb-4">
              <Zap className="h-8 w-8 text-violet-500" />
            </div>
            <p className="text-muted-foreground font-medium">No XP earned yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start by committing to an issue to earn your first XP!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
