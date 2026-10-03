import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const barcode =
    request.nextUrl.searchParams
      .get('barcode')
      ?.trim();

  if (!barcode) {
    return NextResponse.json(
      {
        error: 'Barcode is required.',
      },
      {
        status: 400,
      }
    );
  }

  const authorization =
    request.headers.get('authorization');

  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json(
      {
        error: 'Authentication required.',
      },
      {
        status: 401,
      }
    );
  }

  const accessToken =
    authorization.slice('Bearer '.length).trim();

  if (!accessToken) {
    return NextResponse.json(
      {
        error: 'Authentication required.',
      },
      {
        status: 401,
      }
    );
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        {
          error: 'Authentication required.',
        },
        {
          status: 401,
        }
      );
    }

    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(
        barcode
      )}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.message ||
            'External barcode lookup failed.',
        },
        {
          status: response.status,
        }
      );
    }

    const item = data?.items?.[0];

    if (!item) {
      return NextResponse.json(
        {
          found: false,
          barcode,
        },
        {
          status: 200,
        }
      );
    }

    return NextResponse.json({
      found: true,
      barcode,
      product: {
        name:
          item.title ||
          '',
        category:
          item.category ||
          '',
        brand:
          item.brand ||
          '',
        description:
          item.description ||
          '',
        image:
          item.images?.[0] ||
          null,
        upc:
          item.upc ||
          null,
        ean:
          item.ean ||
          null,
        gtin:
          item.gtin ||
          null,
      },
    });
  } catch (error) {
    console.error(
      'External barcode API error:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Unable to contact the external barcode service.',
      },
      {
        status: 500,
      }
    );
  }
}