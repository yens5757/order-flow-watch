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


def partial_spearman(a, b, z):
    """Spearman's rho between a and b with z held constant (partial correlation of the ranks)."""
    ra, rb, rz = ranks(a), ranks(b), ranks(z)
    ab, az, bz = pearson(ra, rb), pearson(ra, rz), pearson(rb, rz)
    den = ((1 - az * az) * (1 - bz * bz)) ** 0.5
    return (ab - az * bz) / den if den else float("nan")


def perm_p(a, b, n=10000, seed=1, z=None):
    """Two-sided permutation p-value for Spearman's rho (partial rho given z: a is shuffled)."""
    rng = random.Random(seed)
    if z is not None:
        obs, a = abs(partial_spearman(a, b, z)), list(a)
        hits = 0
        for _ in range(n):
            rng.shuffle(a)
            if abs(partial_spearman(a, b, z)) >= obs - 1e-12:
                hits += 1
        return hits / n
    obs = abs(spearman(a, b))
    ra, rb = ranks(a), ranks(b)
    hits = 0
    for _ in range(n):
        rng.shuffle(rb)
        if abs(pearson(ra, rb)) >= obs - 1e-12:
            hits += 1
    return hits / n


def boot_ci(a, b, n=3000, seed=1, z=None):
    """95% bootstrap interval for Spearman's rho, or partial rho given z (resampling brokers)."""
    rng = random.Random(seed)
    idx = range(len(a))
    vals = []
    for _ in range(n):
        s = [rng.choice(idx) for _ in idx]
        x, y = [a[i] for i in s], [b[i] for i in s]
        if z is None:
            if len(set(x)) > 1 and len(set(y)) > 1:
                vals.append(spearman(x, y))
            continue
        w = [z[i] for i in s]
        r = partial_spearman(x, y, w) if min(len(set(x)), len(set(y)), len(set(w))) > 1 else float("nan")
        if r == r:  # skip degenerate resamples (nan)
            vals.append(r)
    vals.sort()
    return vals[int(0.025 * len(vals))], vals[int(0.975 * len(vals))]


def test(a, b, z=None):
    """Everything a results table needs for one correlation; with z, the partial correlation given z."""
    if len(a) < 4:
        return None
    lo, hi = boot_ci(a, b, z=z)
    rho = spearman(a, b) if z is None else partial_spearman(a, b, z)
    return {"rho": round(rho, 3), "p": round(perm_p(a, b, z=z), 3),
            "lo": round(lo, 3), "hi": round(hi, 3), "n": len(a)}
