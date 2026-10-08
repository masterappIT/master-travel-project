export class ObservabilityRegionWriteTracker {
  private sequence = 0;
  private completedSequence = 0;
  get version() { return this.completedSequence; }
  status: "pending" | "ok" | "error" = "pending";
  checkedAt: string | null = null;

  begin() {
    return ++this.sequence;
  }

  complete(sequence: number, status: "ok" | "error") {
    if (sequence < this.completedSequence) return false;
    this.completedSequence = sequence;
    const changed = this.status !== status;
    this.status = status;
    this.checkedAt = new Date().toISOString();
    return changed;
  }
}
