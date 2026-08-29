import { NextRequest, NextResponse } from 'next/server';

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

  try {
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