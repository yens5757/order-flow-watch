"""
Small-sample statistics without numpy/scipy: Spearman rank correlation, permutation p-values and
bootstrap confidence intervals. With ~14 brokers, these are the honest tools (no normality assumed).
"""

import random
import statistics as st


def ranks(v):
    """1-based ranks; tied values share their average rank."""
    order = sorted(range(len(v)), key=lambda i: v[i])
    r = [0.0] * len(v)
    k = 0
    while k < len(v):
        j = k
        while j + 1 < len(v) and v[order[j + 1]] == v[order[k]]:
            j += 1
        for m in range(k, j + 1):
            r[order[m]] = (k + j) / 2 + 1
        k = j + 1
    return r


def pearson(a, b):
    ma, mb = st.mean(a), st.mean(b)
    den = (sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b)) ** 0.5
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / den if den else float("nan")


def spearman(a, b):
    return pearson(ranks(a), ranks(b))


def perm_p(a, b, n=10000, seed=1):
    """Two-sided permutation p-value for Spearman's rho."""
    rng = random.Random(seed)
    obs = abs(spearman(a, b))
    ra, rb = ranks(a), ranks(b)
    hits = 0
    for _ in range(n):
        rng.shuffle(rb)
        if abs(pearson(ra, rb)) >= obs - 1e-12:
            hits += 1
    return hits / n


def boot_ci(a, b, n=3000, seed=1):
    """95% bootstrap interval for Spearman's rho (resampling brokers)."""
    rng = random.Random(seed)
    idx = range(len(a))
    vals = []
    for _ in range(n):
        s = [rng.choice(idx) for _ in idx]
        x, y = [a[i] for i in s], [b[i] for i in s]
        if len(set(x)) > 1 and len(set(y)) > 1:
            vals.append(spearman(x, y))
    vals.sort()
    return vals[int(0.025 * len(vals))], vals[int(0.975 * len(vals))]


def test(a, b):
    """Everything a results table needs for one correlation."""
    if len(a) < 4:
        return None
    lo, hi = boot_ci(a, b)
    return {"rho": round(spearman(a, b), 3), "p": round(perm_p(a, b), 3),
            "lo": round(lo, 3), "hi": round(hi, 3), "n": len(a)}
